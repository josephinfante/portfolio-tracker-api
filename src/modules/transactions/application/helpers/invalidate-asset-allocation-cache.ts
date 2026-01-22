import { buildAssetAllocationCachePattern } from "@modules/portfolio-snapshots/application/helpers/asset-allocation-cache";
import { RedisClient } from "@shared/redis/redis.client";

export const invalidateAssetAllocationCache = async (
	redisClient: RedisClient,
	userId: string,
): Promise<void> => {
	await redisClient.delByPattern(buildAssetAllocationCachePattern(userId));
};
