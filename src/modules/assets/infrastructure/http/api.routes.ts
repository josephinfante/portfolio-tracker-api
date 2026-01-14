import { Router } from "express";
import { container } from "tsyringe";
import { AssetController } from "./asset.controller";
import { authMiddleware } from "@bootstrap/middlewares/auth-middleware";

export function createAssetApiRoutes() {
	const router = Router();
	const controller = container.resolve(AssetController);

	router.use(authMiddleware);

	router.post("/", controller.create);
	router.get("/", controller.list);
	router.get("/:id", controller.findById);
	router.patch("/:id", controller.update);
	router.delete("/:id", controller.remove);

	return router;
}
