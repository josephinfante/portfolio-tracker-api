import { createApp } from "@bootstrap/create-app";
import { environment } from "@shared/config/environment";
import { TOKENS } from "@shared/container/tokens";
import { logger } from "@shared/logger";
import { RedisClient } from "@shared/redis/redis.client";
import { container } from "tsyringe";

export async function startServer() {
	const app = createApp();

	const redis = container.resolve<RedisClient>(TOKENS.RedisClient);
	await redis.connect();

	const server = app.listen(environment.PORT, () => {
		logger.info(`Server running in ${environment.NODE_ENV} mode on port ${environment.PORT}`);
	});

	const shutdown = async () => {
		logger.info("Shutting down gracefully...");

		server.close();

		await redis.disconnect();

		logger.info("Shutdown complete.");
		process.exit(0);
	};

	process.on("SIGINT", shutdown);
	process.on("SIGTERM", shutdown);
}
