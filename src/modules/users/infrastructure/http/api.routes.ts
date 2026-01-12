import { Router } from "express";
import { container } from "tsyringe";
import { UserController } from "./user.controller";

export function createApiUserRoutes() {
	const router = Router();
	const controller = container.resolve(UserController);

	router.post("/", controller.create);
	router.put("/me", controller.update);
	router.get("/me", controller.findById);

	return router;
}
