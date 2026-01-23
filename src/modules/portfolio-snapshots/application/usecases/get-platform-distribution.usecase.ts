import { AccountRepository } from "@modules/accounts/domain/account.repository";
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
import { PlatformDistributionDto } from "@modules/portfolio-snapshots/domain/platform-distribution.types";
import { GetHoldingsByAccountUseCase } from "@modules/transactions/application/usecases/get-holdings-by-account.usecase";
import { TOKENS } from "@shared/container/tokens";
import { ValidationError } from "@shared/errors/domain/validation.error";
import { zodErrorMapper } from "@shared/helpers/zod-error-mapper";
import { D, toFixed } from "@shared/helpers/decimal";
import Decimal from "decimal.js";
import { RedisClient } from "@shared/redis/redis.client";
import { DateTime } from "luxon";
import { inject, injectable } from "tsyringe";
import { buildPlatformDistributionCacheKey } from "../helpers/platform-distribution-cache";
import { GetPlatformDistributionSchema } from "../validators/get-platform-distribution.validator";

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

@injectable()
export class GetPlatformDistributionUseCase {
	private priceProvider: AssetPriceProvider<{ quote: TwelveDataQuoteResponse; historical: unknown }> =
		new TwelvedataProvider();

	constructor(
		private readonly getHoldingsByAccountUseCase: GetHoldingsByAccountUseCase,
		@inject(TOKENS.AccountRepository) private readonly accountRepository: AccountRepository,
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

	private resolvePriceUsd(asset: AssetEntity, quoteMap: Record<string, TwelveDataQuoteItem> | null): Decimal | null {
		const assetSymbol = asset.symbol.toUpperCase();

		if (asset.asset_type === AssetType.fiat) {
			if (assetSymbol === "USD") {
				return D(1);
			}

			const fxSymbol = `USD/${assetSymbol}`;
			const fxItem = getQuoteItem(quoteMap, fxSymbol);
			const close = fxItem ? toNumber(fxItem.close) : undefined;
			if (close && close > 0) {
				return D(1).div(D(close));
			}

			return null;
		}

		const providerSymbol = getProviderSymbolForAsset(asset);
		const quoteItem = getQuoteItem(quoteMap, providerSymbol);
		const close = quoteItem ? toNumber(quoteItem.close) : undefined;
		if (close && close > 0) {
			return D(close);
		}

		return null;
	}

	async execute(userId: string, input: unknown): Promise<PlatformDistributionDto> {
		if (!userId || typeof userId !== "string") {
			throw new ValidationError("Invalid user ID", "userId");
		}

		const result = GetPlatformDistributionSchema.safeParse(input);
		if (!result.success) {
			throw new ValidationError("Invalid distribution query", undefined, undefined, {
				context: { errors: zodErrorMapper(result.error) },
			});
		}

		const fxRate = await this.exchangeRateService.getFxUsdToBase(userId);
		const resolvedAsOfDate =
			result.data.asOfDate ?? DateTime.utc().toISODate() ?? new Date().toISOString().slice(0, 10);
		const cacheKey = buildPlatformDistributionCacheKey(userId, fxRate.baseCurrency);
		const cached = await this.redisClient.get(cacheKey);
		if (cached) {
			try {
				return JSON.parse(cached) as PlatformDistributionDto;
			} catch {
				// ignore cache parse errors
			}
		}

		const { items: accounts } = await this.accountRepository.findByUserId(userId, { pageSize: 0 });
		if (!accounts.length) {
			const emptyResponse: PlatformDistributionDto = {
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

		const accountMap = new Map(
			accounts.map((account) => [
				account.id,
				{
					platformId: account.platformId,
					name: account.platform?.name ?? account.platformId,
				},
			]),
		);

		const holdingsByAccount = await this.getHoldingsByAccountUseCase.execute(userId);
		if (!holdingsByAccount.length) {
			const emptyResponse: PlatformDistributionDto = {
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

		const filteredHoldings = holdingsByAccount.filter((holding) => accountMap.has(holding.accountId));
		if (!filteredHoldings.length) {
			const emptyResponse: PlatformDistributionDto = {
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

		const assetIds = Array.from(new Set(filteredHoldings.map((holding) => holding.assetId)));
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

		const priceUsdByAsset = new Map<string, Decimal>();
		for (const asset of assets) {
			const priceUsd = this.resolvePriceUsd(asset, quoteMap);
			if (priceUsd) {
				priceUsdByAsset.set(asset.id, priceUsd);
			}
		}

		const platformTotals = new Map<string, { platformId: string; name: string; valueUsd: Decimal }>();
		let totalUsd = D(0);

		for (const holding of filteredHoldings) {
			const asset = assetMap.get(holding.assetId);
			if (!asset) {
				continue;
			}

			const priceUsd = priceUsdByAsset.get(asset.id);
			if (!priceUsd) {
				continue;
			}

			const accountInfo = accountMap.get(holding.accountId);
			if (!accountInfo) {
				continue;
			}

			const valueUsd = D(holding.quantity).mul(priceUsd);
			totalUsd = totalUsd.plus(valueUsd);

			const current = platformTotals.get(accountInfo.platformId) ?? {
				platformId: accountInfo.platformId,
				name: accountInfo.name,
				valueUsd: D(0),
			};
			current.valueUsd = current.valueUsd.plus(valueUsd);
			platformTotals.set(accountInfo.platformId, current);
		}

		const totalUsdAmount = Number(toFixed(totalUsd));
		const totalBaseAmount = Number(toFixed(totalUsd.mul(D(fxRate.fxUsdToBase))));

		const items = Array.from(platformTotals.values())
			.map((entry) => {
				const valueUsd = Number(toFixed(entry.valueUsd));
				const valueBase = Number(toFixed(entry.valueUsd.mul(D(fxRate.fxUsdToBase))));
				const percentUsd = totalUsdAmount > 0 ? Number(((valueUsd / totalUsdAmount) * 100).toFixed(2)) : 0;

				return {
					platformId: entry.platformId,
					name: entry.name,
					valueUsd,
					valueBase,
					percentUsd,
				};
			})
			.sort((a, b) => b.valueUsd - a.valueUsd);

		const response: PlatformDistributionDto = {
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
