import { Router } from "express";
import { container } from "tsyringe";
import { authMiddleware } from "@bootstrap/middlewares/auth-middleware";
import { MetricsController } from "./metrics.controller";

export function createMetricsApiRoutes() {
	const router = Router();
	const controller = container.resolve(MetricsController);

	router.use(authMiddleware);
	router.get("/", controller.getMetrics);

	return router;
}
