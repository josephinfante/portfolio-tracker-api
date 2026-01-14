import { Router } from "express";
import { container } from "tsyringe";
import { PlatformController } from "./platform.controller";
import { authMiddleware } from "@bootstrap/middlewares/auth-middleware";

export function createPlatformApiRoutes() {
	const router = Router();
	const controller = container.resolve(PlatformController);

	router.use(authMiddleware);

	router.post("/", controller.create);
	router.get("/", controller.list);
	router.get("/:id", controller.findById);
	router.patch("/:id", controller.update);
	router.delete("/:id", controller.remove);

	return router;
}
