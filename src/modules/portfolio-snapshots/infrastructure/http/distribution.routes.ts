import { Router } from "express";
import { container } from "tsyringe";
import { authMiddleware } from "@bootstrap/middlewares/auth-middleware";
import { DistributionController } from "./distribution.controller";

export function createDistributionApiRoutes() {
	const router = Router();
	const controller = container.resolve(DistributionController);

	router.use(authMiddleware);
	router.get("/platforms", controller.getPlatforms);

	return router;
}
