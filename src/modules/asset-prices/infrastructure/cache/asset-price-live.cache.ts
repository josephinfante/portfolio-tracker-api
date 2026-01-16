import { AssetPriceLiveCache } from "@modules/asset-prices/domain/asset-price.types";
import { RedisClient } from "@shared/redis/redis.client";

const DEFAULT_TTL_SECONDS = 60;

export class AssetPriceLiveCacheStore {
	constructor(private readonly redis: RedisClient, private readonly ttlSeconds = DEFAULT_TTL_SECONDS) {}

	private buildKey(symbol: string, quoteCurrency: string): string {
		return `asset:live:price:${symbol}:${quoteCurrency}`;
	}

	async set(cache: AssetPriceLiveCache): Promise<void> {
		const key = this.buildKey(cache.symbol, cache.quoteCurrency);
		await this.redis.setex(key, this.ttlSeconds, JSON.stringify(cache));
	}

	async setMany(caches: AssetPriceLiveCache[]): Promise<void> {
		await Promise.all(caches.map((cache) => this.set(cache)));
	}
}
