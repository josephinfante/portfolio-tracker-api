import { AssetRepository } from "@modules/assets/domain/asset.repository";
import { AssetEntity } from "@modules/assets/domain/asset.entity";
import { AssetType } from "@modules/assets/domain/asset.types";
import { AssetPriceLiveCacheResponse, AssetPriceLiveCache } from "@modules/asset-prices/domain/asset-price.types";
import { TwelvedataProvider } from "@modules/asset-prices/infrastructure/providers/twelvedata.provider";
import {
	buildLivePriceCaches,
	getProviderSymbolForAsset,
	isTwelveDataQuoteResponse,
	requestProviderQuotes,
} from "@modules/asset-prices/infrastructure/providers/asset-price.provider";
import { AssetPriceLiveCacheStore } from "@modules/asset-prices/infrastructure/cache/asset-price-live.cache";
import { TOKENS } from "@shared/container/tokens";
import { NotFoundError } from "@shared/errors/domain/not-found.error";
import { ValidationError } from "@shared/errors/domain/validation.error";
import { RedisClient } from "@shared/redis/redis.client";
import { inject, injectable } from "tsyringe";

const allowedTypes = new Set([AssetType.crypto, AssetType.stablecoin, AssetType.fiat, AssetType.stock, AssetType.etf]);

const normalizeIdentifiers = (assets: string[]) =>
	assets.map((asset) => asset.trim()).filter((asset) => asset.length > 0);

@injectable()
export class GetAssetLivePriceUseCase {
	private priceProvider = new TwelvedataProvider();
	private cacheStore: AssetPriceLiveCacheStore;

	constructor(
		@inject(TOKENS.AssetRepository) private assetRepository: AssetRepository,
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

		const symbols = found.map((asset) => getProviderSymbolForAsset(asset));
		const data = await requestProviderQuotes(this.priceProvider, symbols);

		if (!isTwelveDataQuoteResponse(data)) {
			return { items: [], totalCount: 0 };
		}

		const caches = buildLivePriceCaches(this.priceProvider, found, data);
		if (caches.length) {
			await this.cacheStore.setMany(caches);
		}

		return {
			items: caches,
			totalCount: caches.length,
		};
	}
}
