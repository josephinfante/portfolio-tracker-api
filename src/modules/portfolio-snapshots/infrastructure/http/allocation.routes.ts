import { Router } from "express";
import { container } from "tsyringe";
import { authMiddleware } from "@bootstrap/middlewares/auth-middleware";
import { AllocationController } from "./allocation.controller";

export function createAllocationApiRoutes() {
	const router = Router();
	const controller = container.resolve(AllocationController);

	router.use(authMiddleware);
	router.get("/assets", controller.getAssets);

	return router;
}
