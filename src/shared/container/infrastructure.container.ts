import { container } from "tsyringe";
import { TOKENS } from "./tokens";
import { RedisClient } from "@shared/redis/redis.client";
import { db } from "@shared/database/drizzle/client";
import { logger } from "@shared/logger";
import { BcryptPasswordService } from "@modules/auth/infrastructure/services/bcrypt-password.service";
import { JwtTokenService } from "@modules/auth/infrastructure/services/jwt-token.service";

export function registerInfrastructure() {
	container.registerSingleton(TOKENS.RedisClient, RedisClient);
	container.register(TOKENS.Drizzle, { useValue: db });
	container.registerInstance(TOKENS.Logger, logger);
	container.register(TOKENS.PasswordHasher, { useClass: BcryptPasswordService });
	container.register(TOKENS.TokenService, { useClass: JwtTokenService });
}
