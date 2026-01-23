import { AssetRepository } from "@modules/assets/domain/asset.repository";
import { AssetEntity } from "@modules/assets/domain/asset.entity";
import { AssetType } from "@modules/assets/domain/asset.types";
import { AssetPriceLiveCacheResponse, AssetPriceLiveCache } from "@modules/asset-prices/domain/asset-price.types";
import { TwelvedataProvider } from "@modules/asset-prices/infrastructure/providers/twelvedata.provider";
import {
	buildLivePriceCaches,
	getBinanceSymbolForAsset,
	getProviderSymbolForAsset,
	normalizeTwelveDataQuoteResponse,
	requestProviderQuotesWithCache,
} from "@modules/asset-prices/infrastructure/providers/asset-price.provider";
import { AssetPriceLiveCacheStore } from "@modules/asset-prices/infrastructure/cache/asset-price-live.cache";
import { TOKENS } from "@shared/container/tokens";
import { NotFoundError } from "@shared/errors/domain/not-found.error";
import { ValidationError } from "@shared/errors/domain/validation.error";
import { RedisClient } from "@shared/redis/redis.client";
import { inject, injectable } from "tsyringe";
import {
	AssetPriceProvider,
	TwelveDataQuoteResponse,
} from "@modules/asset-prices/infrastructure/providers/price-provider.interface";
import { AssetPriceRepository } from "@modules/asset-prices/domain/asset-price.repository";
import { BinanceProvider } from "@modules/asset-prices/infrastructure/providers/binance.provider";

const allowedTypes = new Set([AssetType.crypto, AssetType.stablecoin, AssetType.fiat, AssetType.stock, AssetType.etf]);

const normalizeIdentifiers = (assets: string[]) =>
	assets.map((asset) => asset.trim()).filter((asset) => asset.length > 0);

@injectable()
export class GetAssetLivePriceUseCase {
	private priceProvider: AssetPriceProvider<{ quote: TwelveDataQuoteResponse; historical: unknown }> =
		new TwelvedataProvider();
	private cryptoPriceProvider: AssetPriceProvider<{ quote: TwelveDataQuoteResponse; historical: unknown }> =
		new BinanceProvider();
	private cacheStore: AssetPriceLiveCacheStore;

	constructor(
		@inject(TOKENS.AssetRepository) private assetRepository: AssetRepository,
		@inject(TOKENS.AssetPriceRepository) private assetPriceRepository: AssetPriceRepository,
		@inject(TOKENS.RedisClient) private redisClient: RedisClient,
	) {
		this.cacheStore = new AssetPriceLiveCacheStore(this.redisClient);
	}

	private validateAssets(assets: AssetEntity[]): void {
		const invalid = assets.find((asset) => !allowedTypes.has(asset.asset_type));
		if (invalid) {
			throw new ValidationError("Asset type not supported for live price", "assetType");
		}
	}

	private resolveMissing(identifiers: string[], assets: AssetEntity[]): string[] {
		const normalized = identifiers.map((value) => value.toLowerCase());
		const matched = new Set<string>();

		assets.forEach((asset) => {
			matched.add(asset.id.toLowerCase());
			matched.add(asset.symbol.toLowerCase());
			matched.add(asset.name.toLowerCase());
		});

		return normalized.filter((value) => !matched.has(value));
	}

	async execute(assets: string[]): Promise<AssetPriceLiveCacheResponse> {
		if (!Array.isArray(assets)) {
			throw new ValidationError("Invalid assets array", "assets");
		}

		const identifiers = normalizeIdentifiers(assets);
		if (!identifiers.length) {
			throw new ValidationError("Assets are required", "assets");
		}

		const found = await this.assetRepository.findByIdentifiers(identifiers);
		if (!found.length) {
			throw new NotFoundError("Assets not found");
		}

		const missing = this.resolveMissing(identifiers, found);
		if (missing.length) {
			throw new NotFoundError(`Assets not found: ${missing.join(", ")}`);
		}

		this.validateAssets(found);

		const cryptoAssets = found.filter(
			(asset) => asset.asset_type === AssetType.crypto || asset.asset_type === AssetType.stablecoin,
		);
		const otherAssets = found.filter(
			(asset) => asset.asset_type !== AssetType.crypto && asset.asset_type !== AssetType.stablecoin,
		);

		const twelvedataSymbols = otherAssets.map((asset) => getProviderSymbolForAsset(asset));
		const binanceSymbols = cryptoAssets.map((asset) => getBinanceSymbolForAsset(asset)).filter((symbol) => symbol);

		const [twelvedataResponse, binanceResponse] = await Promise.all([
			twelvedataSymbols.length
				? requestProviderQuotesWithCache(
						this.priceProvider,
						otherAssets,
						this.assetPriceRepository,
						twelvedataSymbols,
					)
				: Promise.resolve(null),
			binanceSymbols.length
				? requestProviderQuotesWithCache(
						this.cryptoPriceProvider,
						cryptoAssets,
						this.assetPriceRepository,
						binanceSymbols,
						{ symbolResolver: getBinanceSymbolForAsset },
					)
				: Promise.resolve(null),
		]);

		const twelvedataNormalized = normalizeTwelveDataQuoteResponse(twelvedataResponse);
		const binanceNormalized = normalizeTwelveDataQuoteResponse(binanceResponse);
		if (!twelvedataNormalized && !binanceNormalized) {
			return { items: [], totalCount: 0 };
		}

		const caches = [
			...buildLivePriceCaches(this.priceProvider, otherAssets, twelvedataNormalized),
			...buildLivePriceCaches(this.cryptoPriceProvider, cryptoAssets, binanceNormalized, {
				symbolResolver: getBinanceSymbolForAsset,
			}),
		];
		if (caches.length) {
			await this.cacheStore.setMany(caches);
		}

		return {
			items: caches,
			totalCount: caches.length,
		};
	}
}
