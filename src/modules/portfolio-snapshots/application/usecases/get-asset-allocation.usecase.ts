import { AssetRepository } from "@modules/assets/domain/asset.repository";
import { AssetEntity } from "@modules/assets/domain/asset.entity";
import { AssetType } from "@modules/assets/domain/asset.types";
import {
	getProviderSymbolForAsset,
	normalizeTwelveDataQuoteResponse,
	requestProviderQuotesWithCache,
} from "@modules/asset-prices/infrastructure/providers/asset-price.provider";
import { TwelvedataProvider } from "@modules/asset-prices/infrastructure/providers/twelvedata.provider";
import {
	AssetPriceProvider,
	TwelveDataQuoteItem,
	TwelveDataQuoteResponse,
} from "@modules/asset-prices/infrastructure/providers/price-provider.interface";
import { AssetPriceRepository } from "@modules/asset-prices/domain/asset-price.repository";
import { ExchangeRateService } from "@modules/exchange-rates/application/exchange-rate.service";
import { AllocationType, AssetAllocationDto } from "@modules/portfolio-snapshots/domain/asset-allocation.types";
import { GetHoldingsByAccountUseCase } from "@modules/transactions/application/usecases/get-holdings-by-account.usecase";
import { TOKENS } from "@shared/container/tokens";
import { ValidationError } from "@shared/errors/domain/validation.error";
import { zodErrorMapper } from "@shared/helpers/zod-error-mapper";
import { D, toFixed } from "@shared/helpers/decimal";
import Decimal from "decimal.js";
import { RedisClient } from "@shared/redis/redis.client";
import { DateTime } from "luxon";
import { inject, injectable } from "tsyringe";
import { buildAssetAllocationCacheKey } from "../helpers/asset-allocation-cache";
import { GetAssetAllocationSchema } from "../validators/get-asset-allocation.validator";

const CACHE_TTL_SECONDS = 180;

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

const getQuoteItem = (data: Record<string, TwelveDataQuoteItem> | null, symbol: string): TwelveDataQuoteItem | null => {
	if (!data) {
		return null;
	}
	return data[symbol] ?? data[symbol.toLowerCase()] ?? data[symbol.toUpperCase()] ?? null;
};

const mapAllocationType = (assetType: AssetType): AllocationType | null => {
	switch (assetType) {
		case AssetType.stock:
		case AssetType.etf:
		case AssetType.commodity:
			return "stocks";
		case AssetType.crypto:
		case AssetType.stablecoin:
			return "crypto";
		case AssetType.fiat:
			return "fiat";
		default:
			return null;
	}
};

const getLabel = (type: AllocationType): string => {
	switch (type) {
		case "stocks":
			return "Stocks";
		case "crypto":
			return "Crypto";
		case "fiat":
			return "Fiat";
		default:
			return type;
	}
};

@injectable()
export class GetAssetAllocationUseCase {
	private priceProvider: AssetPriceProvider<{ quote: TwelveDataQuoteResponse; historical: unknown }> =
		new TwelvedataProvider();

	constructor(
		private readonly getHoldingsByAccountUseCase: GetHoldingsByAccountUseCase,
		@inject(TOKENS.AssetRepository) private readonly assetRepository: AssetRepository,
		@inject(TOKENS.AssetPriceRepository) private readonly assetPriceRepository: AssetPriceRepository,
		private readonly exchangeRateService: ExchangeRateService,
		@inject(TOKENS.RedisClient) private readonly redisClient: RedisClient,
	) {}

	private buildSymbols(assets: AssetEntity[]): string[] {
		const symbols = new Set<string>();

		for (const asset of assets) {
			const providerSymbol = getProviderSymbolForAsset(asset);
			if (providerSymbol.toUpperCase() === "USD/USD") {
				continue;
			}
			symbols.add(providerSymbol);
		}

		return Array.from(symbols);
	}

	private normalizeQuoteMap(data: TwelveDataQuoteResponse | null): Record<string, TwelveDataQuoteItem> | null {
		const normalized = normalizeTwelveDataQuoteResponse(data);
		if (!normalized) {
			return null;
		}
		return normalized;
	}

	async execute(userId: string, input: unknown): Promise<AssetAllocationDto> {
		if (!userId || typeof userId !== "string") {
			throw new ValidationError("Invalid user ID", "userId");
		}

		const result = GetAssetAllocationSchema.safeParse(input);
		if (!result.success) {
			throw new ValidationError("Invalid allocation query", undefined, undefined, {
				context: { errors: zodErrorMapper(result.error) },
			});
		}

		const fxRate = await this.exchangeRateService.getFxUsdToBase(userId);
		const resolvedAsOfDate = DateTime.utc().toISODate() ?? new Date().toISOString().slice(0, 10);
		const cacheKey = buildAssetAllocationCacheKey(userId, fxRate.baseCurrency);
		const cached = await this.redisClient.get(cacheKey);
		if (cached) {
			try {
				return JSON.parse(cached) as AssetAllocationDto;
			} catch {
				// ignore cache parse errors
			}
		}

		const holdingsByAccount = await this.getHoldingsByAccountUseCase.execute(userId);
		if (!holdingsByAccount.length) {
			const emptyResponse: AssetAllocationDto = {
				asOfDate: resolvedAsOfDate,
				baseCurrencyCode: fxRate.baseCurrency,
				fxUsdToBase: fxRate.fxUsdToBase,
				total: {
					valueUsd: 0,
					valueBase: 0,
				},
				items: [],
			};
			await this.redisClient.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(emptyResponse));
			return emptyResponse;
		}

		const quantityByAsset = new Map<string, number>();
		for (const holding of holdingsByAccount) {
			const current = quantityByAsset.get(holding.assetId) ?? 0;
			quantityByAsset.set(holding.assetId, current + holding.quantity);
		}

		const assetIds = Array.from(quantityByAsset.keys());
		const assets = await this.assetRepository.findByIdentifiers(assetIds);
		const assetMap = new Map(assets.map((asset) => [asset.id, asset]));

		const symbols = this.buildSymbols(assets);
		const quoteResponse = symbols.length
			? await requestProviderQuotesWithCache(
					this.priceProvider,
					assets,
					this.assetPriceRepository,
					symbols,
				)
			: null;
		const quoteMap = this.normalizeQuoteMap(quoteResponse);

		const allocationTotals = new Map<AllocationType, { valueUsd: Decimal }>();
		let totalUsd = D(0);

		for (const [assetId, quantity] of quantityByAsset.entries()) {
			const asset = assetMap.get(assetId);
			if (!asset) {
				continue;
			}

			const allocationType = mapAllocationType(asset.asset_type);
			if (!allocationType) {
				continue;
			}

			let priceUsd: Decimal | null = null;
			const assetSymbol = asset.symbol.toUpperCase();

			if (asset.asset_type === AssetType.fiat) {
				if (assetSymbol === "USD") {
					priceUsd = D(1);
				} else {
					const fxSymbol = `USD/${assetSymbol}`;
					const fxItem = getQuoteItem(quoteMap, fxSymbol);
					const close = fxItem ? toNumber(fxItem.close) : undefined;
					if (close && close > 0) {
						priceUsd = D(1).div(D(close));
					}
				}
			} else {
				const providerSymbol = getProviderSymbolForAsset(asset);
				const quoteItem = getQuoteItem(quoteMap, providerSymbol);
				const close = quoteItem ? toNumber(quoteItem.close) : undefined;
				if (close && close > 0) {
					priceUsd = D(close);
				}
			}

			if (!priceUsd) {
				continue;
			}

			const valueUsd = D(quantity).mul(priceUsd);
			totalUsd = totalUsd.plus(valueUsd);

			const current = allocationTotals.get(allocationType) ?? { valueUsd: D(0) };
			current.valueUsd = current.valueUsd.plus(valueUsd);
			allocationTotals.set(allocationType, current);
		}

		const totalUsdAmount = Number(toFixed(totalUsd));
		const totalBaseAmount = Number(toFixed(totalUsd.mul(D(fxRate.fxUsdToBase))));

		const items = Array.from(allocationTotals.entries())
			.map(([type, entry]) => {
				const valueUsd = Number(toFixed(entry.valueUsd));
				const valueBase = Number(toFixed(entry.valueUsd.mul(D(fxRate.fxUsdToBase))));
				const percentUsd = totalUsdAmount > 0 ? Number(((valueUsd / totalUsdAmount) * 100).toFixed(2)) : 0;

				return {
					type,
					label: getLabel(type),
					valueUsd,
					valueBase,
					percentUsd,
				};
			})
			.sort((a, b) => b.valueUsd - a.valueUsd);

		const response: AssetAllocationDto = {
			asOfDate: resolvedAsOfDate,
			baseCurrencyCode: fxRate.baseCurrency,
			fxUsdToBase: fxRate.fxUsdToBase,
			total: {
				valueUsd: totalUsdAmount,
				valueBase: totalBaseAmount,
			},
			items,
		};

		await this.redisClient.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(response));
		return response;
	}
}
