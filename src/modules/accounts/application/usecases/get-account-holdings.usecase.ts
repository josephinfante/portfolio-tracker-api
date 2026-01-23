import { AccountRepository } from "@modules/accounts/domain/account.repository";
import { AccountHoldingsResponseDTO } from "@modules/accounts/domain/account-holdings.types";
import { AssetRepository } from "@modules/assets/domain/asset.repository";
import { AssetEntity } from "@modules/assets/domain/asset.entity";
import { AssetType } from "@modules/assets/domain/asset.types";
import {
	requestProviderQuotesWithCache,
	normalizeTwelveDataQuoteResponse,
	getProviderSymbolForAsset,
	getBinanceSymbolForAsset,
} from "@modules/asset-prices/infrastructure/providers/asset-price.provider";
import { BinanceProvider } from "@modules/asset-prices/infrastructure/providers/binance.provider";
import { TwelvedataProvider } from "@modules/asset-prices/infrastructure/providers/twelvedata.provider";
import {
	AssetPriceProvider,
	TwelveDataQuoteItem,
	TwelveDataQuoteResponse,
} from "@modules/asset-prices/infrastructure/providers/price-provider.interface";
import { AssetPriceRepository } from "@modules/asset-prices/domain/asset-price.repository";
import { TransactionRepository } from "@modules/transactions/domain/transaction.repository";
import { TransactionCorrectionType, TransactionType } from "@modules/transactions/domain/transaction.types";
import { UserRepository } from "@modules/users/domain/user.repository";
import { D, toFixed } from "@shared/helpers/decimal";
import { TOKENS } from "@shared/container/tokens";
import { AuthorizationError } from "@shared/errors/domain/authorization.error";
import { NotFoundError } from "@shared/errors/domain/not-found.error";
import { ValidationError } from "@shared/errors/domain/validation.error";
import { RedisClient } from "@shared/redis/redis.client";
import { inject, injectable } from "tsyringe";
import { buildAccountHoldingsCacheKey } from "../helpers/account-holdings-cache";

const CACHE_TTL_SECONDS = 300;
const UUID_REGEX = /^[0-9a-fA-F-]{36}$/;

const transactionTypeSigns = new Map<TransactionType, number>([
	[TransactionType.BUY, 1],
	[TransactionType.SELL, -1],
	[TransactionType.DEPOSIT, 1],
	[TransactionType.WITHDRAW, -1],
	[TransactionType.TRANSFER_IN, 1],
	[TransactionType.TRANSFER_OUT, -1],
	[TransactionType.INTEREST, 1],
	[TransactionType.REWARD, 1],
	[TransactionType.DIVIDEND, 1],
	[TransactionType.FEE, -1],
]);

const normalizeQuantity = (
	transactionType: TransactionType,
	correctionType: TransactionCorrectionType | null,
	quantity: number,
) => {
	if (!Number.isFinite(quantity) || quantity === 0) {
		return 0;
	}

	if (correctionType) {
		return quantity;
	}

	const sign = transactionTypeSigns.get(transactionType);
	if (!sign) {
		return quantity;
	}

	if (quantity < 0) {
		return quantity;
	}

	return quantity * sign;
};

const normalizeCurrencyCode = (value: string) => value.trim().toUpperCase();

const toNumber = (value: unknown): number | undefined => {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}
	if (typeof value === "string" && value.trim().length) {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : undefined;
	}
	return undefined;
};

const toTimestamp = (value: unknown): number | undefined => {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value < 1_000_000_000_000 ? value * 1000 : value;
	}
	if (value instanceof Date) {
		return value.getTime();
	}
	if (typeof value === "string" && value.length) {
		const parsed = Date.parse(value);
		return Number.isFinite(parsed) ? parsed : undefined;
	}
	return undefined;
};

const getQuoteItem = (data: Record<string, TwelveDataQuoteItem> | null, symbol: string): TwelveDataQuoteItem | null => {
	if (!data) {
		return null;
	}
	return data[symbol] ?? data[symbol.toLowerCase()] ?? data[symbol.toUpperCase()] ?? null;
};

const mapAssetType = (assetType: AssetType): "fiat" | "crypto" | "stock" | "etf" | "commodity" | "stablecoin" =>
	assetType;

@injectable()
export class GetAccountHoldingsUseCase {
	private priceProvider: AssetPriceProvider<{ quote: TwelveDataQuoteResponse; historical: unknown }> =
		new TwelvedataProvider();
	private cryptoPriceProvider: AssetPriceProvider<{ quote: TwelveDataQuoteResponse; historical: unknown }> =
		new BinanceProvider();

	constructor(
		@inject(TOKENS.AccountRepository) private accountRepository: AccountRepository,
		@inject(TOKENS.TransactionRepository) private transactionRepository: TransactionRepository,
		@inject(TOKENS.AssetRepository) private assetRepository: AssetRepository,
		@inject(TOKENS.AssetPriceRepository) private assetPriceRepository: AssetPriceRepository,
		@inject(TOKENS.UserRepository) private userRepository: UserRepository,
		@inject(TOKENS.RedisClient) private redisClient: RedisClient,
	) {}

	private buildSymbols(assets: AssetEntity[], quoteCurrency: string) {
		const twelvedataSymbols = new Set<string>();
		const binanceSymbols = new Set<string>();
		const normalizedQuote = quoteCurrency.toUpperCase();

		for (const asset of assets) {
			const symbol = asset.symbol?.trim();
			if (!symbol) {
				continue;
			}
			if (asset.asset_type === AssetType.crypto || asset.asset_type === AssetType.stablecoin) {
				const binanceSymbol = getBinanceSymbolForAsset(asset);
				if (binanceSymbol) {
					binanceSymbols.add(binanceSymbol);
				}
				continue;
			}

			const providerSymbol = getProviderSymbolForAsset(asset);
			if (providerSymbol.toUpperCase() !== "USD/USD") {
				twelvedataSymbols.add(providerSymbol);
			}
		}

		if (normalizedQuote !== "USD") {
			twelvedataSymbols.add(`USD/${normalizedQuote}`);
		}

		return {
			twelvedataSymbols: Array.from(twelvedataSymbols),
			binanceSymbols: Array.from(binanceSymbols),
		};
	}

	private normalizeQuoteMap(data: TwelveDataQuoteResponse | null): Record<string, TwelveDataQuoteItem> | null {
		const normalized = normalizeTwelveDataQuoteResponse(data);
		if (!normalized) {
			return null;
		}
		return normalized;
	}

	async execute(userId: string, accountId: string, quoteCurrency?: string): Promise<AccountHoldingsResponseDTO> {
		if (!userId || typeof userId !== "string") {
			throw new ValidationError("Invalid user ID", "userId");
		}

		if (!accountId || typeof accountId !== "string" || !UUID_REGEX.test(accountId)) {
			throw new ValidationError("Invalid account ID", "accountId");
		}

		if (quoteCurrency !== undefined && typeof quoteCurrency !== "string") {
			throw new ValidationError("Invalid quote currency", "quoteCurrency");
		}

		const account = await this.accountRepository.findById(accountId);
		if (!account) {
			throw new NotFoundError(`Account ${accountId} not found`);
		}

		if (account.userId !== userId) {
			throw new AuthorizationError("Access denied");
		}

		let normalizedQuote = quoteCurrency ? normalizeCurrencyCode(quoteCurrency) : "";
		if (!normalizedQuote) {
			const user = await this.userRepository.findById(userId);
			if (!user) {
				throw new NotFoundError(`User ${userId} not found`);
			}
			normalizedQuote = normalizeCurrencyCode(user.baseCurrency || "USD");
		}

		const cacheKey = buildAccountHoldingsCacheKey(userId, accountId, normalizedQuote);
		const cached = await this.redisClient.get(cacheKey);
		if (cached) {
			try {
				return JSON.parse(cached) as AccountHoldingsResponseDTO;
			} catch {
				// ignore cache parse errors
			}
		}

		const { items } = await this.transactionRepository.findByUserId(userId, { limit: 0, offset: 0 });
		const balances = new Map<string, number>();

		for (const transaction of items) {
			if (transaction.accountId !== accountId) {
				continue;
			}

			const normalized = normalizeQuantity(
				transaction.transactionType,
				transaction.correctionType,
				transaction.quantity,
			);
			if (normalized === 0) {
				continue;
			}

			const current = balances.get(transaction.assetId) ?? 0;
			balances.set(transaction.assetId, current + normalized);
		}

		const holdings = Array.from(balances.entries())
			.map(([assetId, quantity]) => ({ assetId, quantity }))
			.filter((holding) => holding.quantity !== 0);

		if (!holdings.length) {
			const response: AccountHoldingsResponseDTO = {
				accountId,
				quoteCurrency: normalizedQuote,
				items: [],
				summary: {
					totalValue: {
						amount: 0,
						currency: normalizedQuote,
					},
					allocationByType: [],
				},
			};
			await this.redisClient.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(response));
			return response;
		}

		const assetIds = holdings.map((holding) => holding.assetId);
		const assets = await this.assetRepository.findByIdentifiers(assetIds);
		if (normalizedQuote !== "USD") {
			const quoteAssets = await this.assetRepository.findByIdentifiers([normalizedQuote]);
			for (const asset of quoteAssets) {
				if (!assets.find((item) => item.id === asset.id)) {
					assets.push(asset);
				}
			}
		}
		const assetMap = new Map(assets.map((asset) => [asset.id, asset]));

		const { twelvedataSymbols, binanceSymbols } = this.buildSymbols(assets, normalizedQuote);
		const [twelvedataResponse, binanceResponse] = await Promise.all([
			twelvedataSymbols.length
				? requestProviderQuotesWithCache(
						this.priceProvider,
						assets,
						this.assetPriceRepository,
						twelvedataSymbols,
					)
				: Promise.resolve(null),
			binanceSymbols.length
				? requestProviderQuotesWithCache(
						this.cryptoPriceProvider,
						assets.filter(
							(asset) => asset.asset_type === AssetType.crypto || asset.asset_type === AssetType.stablecoin,
						),
						this.assetPriceRepository,
						binanceSymbols,
						{ symbolResolver: getBinanceSymbolForAsset },
					)
				: Promise.resolve(null),
		]);
		const quoteMap = this.normalizeQuoteMap({
			...(this.normalizeQuoteMap(twelvedataResponse) ?? {}),
			...(this.normalizeQuoteMap(binanceResponse) ?? {}),
		});

		let effectiveQuote = normalizedQuote;
		let fxUsdToQuote = 1;
		let fxQuoteAt: number | undefined;

		if (normalizedQuote !== "USD") {
			const fxSymbol = `USD/${normalizedQuote}`;
			const fxItem = getQuoteItem(quoteMap, fxSymbol);
			const fxClose = fxItem ? toNumber(fxItem.close) : undefined;
			if (!fxClose || fxClose <= 0) {
				effectiveQuote = "USD";
				fxUsdToQuote = 1;
			} else {
				fxUsdToQuote = fxClose;
				fxQuoteAt = toTimestamp(fxItem?.timestamp) ?? toTimestamp(fxItem?.datetime);
			}
		}

		const now = Date.now();
		let totalValue = D(0);

		const responseItems = holdings.reduce<AccountHoldingsResponseDTO["items"]>((acc, holding) => {
			const asset = assetMap.get(holding.assetId);
			if (!asset) {
				return acc;
			}

			const assetSymbol = asset.symbol.toUpperCase();
			const quantity = D(holding.quantity);
			let price = D(0);
			let priceSource = "manual";
			let priceAt = now;

			if (assetSymbol === effectiveQuote) {
				price = D(1);
				priceSource = "fx";
			} else if (asset.asset_type === AssetType.fiat) {
				if (assetSymbol === "USD") {
					if (effectiveQuote === "USD") {
						price = D(1);
						priceSource = "fx";
					} else if (fxUsdToQuote > 0) {
						price = D(fxUsdToQuote);
						priceSource = "fx";
						priceAt = fxQuoteAt ?? now;
					}
				} else {
					const fxSymbol = `USD/${assetSymbol}`;
					const fxItem = getQuoteItem(quoteMap, fxSymbol);
					const fxClose = fxItem ? toNumber(fxItem.close) : undefined;
					const assetFxAt = toTimestamp(fxItem?.timestamp) ?? toTimestamp(fxItem?.datetime) ?? now;
					if (fxClose && fxClose > 0) {
						const priceUsd = D(1).div(D(fxClose));
						price = effectiveQuote === "USD" ? priceUsd : priceUsd.mul(D(fxUsdToQuote));
						priceSource = "fx";
						priceAt = effectiveQuote === "USD" ? assetFxAt : (fxQuoteAt ?? assetFxAt);
					}
				}
			} else {
				const providerSymbol =
					asset.asset_type === AssetType.crypto || asset.asset_type === AssetType.stablecoin
						? getBinanceSymbolForAsset(asset)
						: getProviderSymbolForAsset(asset);
				const quoteItem = getQuoteItem(quoteMap, providerSymbol);
				const close = quoteItem ? toNumber(quoteItem.close) : undefined;
				const quoteAt = toTimestamp(quoteItem?.timestamp) ?? toTimestamp(quoteItem?.datetime) ?? now;
				if (close && close > 0) {
					const priceUsd = D(close);
					price = effectiveQuote === "USD" ? priceUsd : priceUsd.mul(D(fxUsdToQuote));
					priceSource = "market";
					priceAt = effectiveQuote === "USD" ? quoteAt : (fxQuoteAt ?? quoteAt);
				}
			}

			const value = quantity.mul(price);
			totalValue = totalValue.plus(value);

			const normalizedQuantity = Number(toFixed(quantity));
			const normalizedPrice = Number(toFixed(price));
			const normalizedValue = Number(toFixed(value));

			const item = {
				assetId: holding.assetId,
				asset: {
					id: asset.id,
					symbol: asset.symbol,
					name: asset.name,
					assetType: mapAssetType(asset.asset_type),
				},
				quantity: normalizedQuantity,
				price: {
					amount: normalizedPrice,
					currency: effectiveQuote,
					source: priceSource,
					priceAt,
				},
				value: {
					amount: normalizedValue,
					currency: effectiveQuote,
				},
				nativeValue:
					asset.asset_type === AssetType.fiat && assetSymbol !== effectiveQuote
						? {
								amount: normalizedQuantity,
								currency: assetSymbol,
							}
						: undefined,
				allocationPercent: 0,
			};

			acc.push(item);
			return acc;
		}, []);

		const totalValueAmount = Number(toFixed(totalValue));
		const allocationByTypeMap = new Map<string, { assetType: string; amount: number }>();

		if (totalValueAmount > 0) {
			responseItems.forEach((item) => {
				const percent = (item.value.amount / totalValueAmount) * 100;
				item.allocationPercent = Number(percent.toFixed(2));

				const existing = allocationByTypeMap.get(item.asset.assetType) ?? {
					assetType: item.asset.assetType,
					amount: 0,
				};
				existing.amount += item.value.amount;
				allocationByTypeMap.set(item.asset.assetType, existing);
			});
		}

		const allocationByType = Array.from(allocationByTypeMap.values()).map((entry) => {
			const percent = totalValueAmount > 0 ? (entry.amount / totalValueAmount) * 100 : 0;
			return {
				assetType: entry.assetType as AccountHoldingsResponseDTO["items"][number]["asset"]["assetType"],
				value: {
					amount: Number(entry.amount.toFixed(8)),
					currency: effectiveQuote,
				},
				percent: Number(percent.toFixed(2)),
			};
		});

		const response: AccountHoldingsResponseDTO = {
			accountId,
			quoteCurrency: effectiveQuote,
			items: responseItems,
			summary: {
				totalValue: {
					amount: totalValueAmount,
					currency: effectiveQuote,
				},
				allocationByType,
			},
		};

		await this.redisClient.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(response));
		return response;
	}
}
