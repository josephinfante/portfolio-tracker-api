import { Router } from "express";
import { container } from "tsyringe";
import { AuthController } from "./auth.controller";

export function createAuthApiRoutes() {
	const router = Router();
	const controller = container.resolve(AuthController);

	router.post("/sign-up", controller.signUp);
	router.post("/sign-in", controller.signIn);

	return router;
}
