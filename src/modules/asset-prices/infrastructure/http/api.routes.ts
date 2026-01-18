import { Router } from "express";
import { container } from "tsyringe";
import { AssetPriceController } from "./asset-price.controller";
import { authMiddleware } from "@bootstrap/middlewares/auth-middleware";

export function createAssetPriceApiRoutes() {
	const router = Router();
	const controller = container.resolve(AssetPriceController);

	router.use(authMiddleware);

	router.get("/range", controller.getRange);
	router.get("/live", controller.getLivePrice);
	router.post("/sync", controller.sync);

	return router;
}
