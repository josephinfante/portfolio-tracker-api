import { container } from "tsyringe";
import { TOKENS } from "./tokens";
import { RedisClient } from "@shared/redis/redis.client";
import { db } from "@shared/database/drizzle/client";
import { logger } from "@shared/logger";

export function registerInfrastructure() {
	container.registerSingleton(TOKENS.RedisClient, RedisClient);
	container.register(TOKENS.Drizzle, { useValue: db });
	container.registerInstance(TOKENS.Logger, logger);
}
