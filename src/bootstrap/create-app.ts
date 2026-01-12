import express, { Application } from "express";
import { requestLogger } from "@bootstrap/middlewares/request-logger";
import { errorMiddleware } from "@bootstrap/middlewares/error-middleware";
import { corsMiddleware } from "@bootstrap/middlewares/cors-middleware";
import { helmetMiddleware } from "@bootstrap/middlewares/helmet-middleware";
import { getModuleRouters } from "@shared/container/modules.container";
import { responseMiddleware } from "@bootstrap/middlewares/response-middleware";

export function createApp() {
	const app: Application = express();

	app.set("trust proxy", true);

	app.use(helmetMiddleware);
	app.use(corsMiddleware);
	app.use(express.json({ limit: "10mb" }));
	app.use(express.urlencoded({ extended: true }));

	app.use(requestLogger);
	app.use(responseMiddleware);

	const moduleRouters = getModuleRouters();
	for (const m of moduleRouters) {
		app.use(m.path, m.router);
	}

	app.use(errorMiddleware);

	return app;
}
