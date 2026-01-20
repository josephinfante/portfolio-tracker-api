import { asyncHandler } from "@bootstrap/helpers/async-handler";
import { currenciesDataset } from "@shared/dataset/currencies.dataset";
import { RedisClient } from "@shared/redis/redis.client";
import { Request, Response } from "express";
import { inject, injectable } from "tsyringe";
import { TOKENS } from "@shared/container/tokens";

const CACHE_KEY = "currencies:dataset";
const CACHE_TTL_SECONDS = 60 * 60;

@injectable()
export class CurrencyController {
	constructor(@inject(TOKENS.RedisClient) private readonly redisClient: RedisClient) {}

	list = asyncHandler(async (_req: Request, res: Response) => {
		const cached = await this.redisClient.get(CACHE_KEY);
		if (cached) {
			try {
				const data = JSON.parse(cached) as typeof currenciesDataset;
				return res.status(200).success(data);
			} catch {
				// If cache is corrupted, fall back to fresh payload.
			}
		}

		await this.redisClient.setex(CACHE_KEY, CACHE_TTL_SECONDS, JSON.stringify(currenciesDataset));
		return res.status(200).success(currenciesDataset);
	});
}
