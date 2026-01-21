import { buildAccountHoldingsCachePattern } from "@modules/accounts/application/helpers/account-holdings-cache";
import { RedisClient } from "@shared/redis/redis.client";

export const invalidateAccountHoldingsCache = async (
	redisClient: RedisClient,
	userId: string,
	accountIds: string[],
): Promise<void> => {
	const uniqueAccountIds = Array.from(new Set(accountIds));
	await Promise.all(
		uniqueAccountIds.map((accountId) =>
			redisClient.delByPattern(buildAccountHoldingsCachePattern(userId, accountId)),
		),
	);
};
