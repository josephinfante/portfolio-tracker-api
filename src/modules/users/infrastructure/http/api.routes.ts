import { Router } from "express";
import { container } from "tsyringe";
import { UserController } from "./user.controller";
import { authMiddleware } from "@bootstrap/middlewares/auth-middleware";

export function createApiUserRoutes() {
	const router = Router();
	const controller = container.resolve(UserController);

	router.use(authMiddleware);

	router.patch("/me", controller.update);
	router.get("/me", controller.findById);

	return router;
}
