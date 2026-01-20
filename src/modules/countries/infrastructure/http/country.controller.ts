import { asyncHandler } from "@bootstrap/helpers/async-handler";
import { countriesDataset } from "@shared/dataset/countries.dataset";
import { RedisClient } from "@shared/redis/redis.client";
import { Request, Response } from "express";
import { inject, injectable } from "tsyringe";
import { TOKENS } from "@shared/container/tokens";

const CACHE_KEY = "countries:dataset";
const CACHE_TTL_SECONDS = 5 * 60;

@injectable()
export class CountryController {
	constructor(@inject(TOKENS.RedisClient) private readonly redisClient: RedisClient) {}

	list = asyncHandler(async (_req: Request, res: Response) => {
		const cached = await this.redisClient.get(CACHE_KEY);
		if (cached) {
			try {
				const data = JSON.parse(cached) as typeof countriesDataset;
				return res.status(200).success(data);
			} catch {
				// If cache is corrupted, fall back to fresh payload.
			}
		}

		await this.redisClient.setex(CACHE_KEY, CACHE_TTL_SECONDS, JSON.stringify(countriesDataset));
		return res.status(200).success(countriesDataset);
	});
}
