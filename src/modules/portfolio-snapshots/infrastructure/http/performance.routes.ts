import { Router } from "express";
import { container } from "tsyringe";
import { authMiddleware } from "@bootstrap/middlewares/auth-middleware";
import { PerformanceController } from "./performance.controller";

export function createPerformanceApiRoutes() {
	const router = Router();
	const controller = container.resolve(PerformanceController);

	router.use(authMiddleware);
	router.get("/", controller.getPerformance);

	return router;
}
