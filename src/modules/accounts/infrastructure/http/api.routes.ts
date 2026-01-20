import { Router } from "express";
import { container } from "tsyringe";
import { AccountController } from "./account.controller";
import { authMiddleware } from "@bootstrap/middlewares/auth-middleware";

export function createAccountApiRoutes() {
	const router = Router();
	const controller = container.resolve(AccountController);

	router.use(authMiddleware);

	router.post("/", controller.create);
	router.get("/", controller.list);
	router.get("/:id/balance", controller.balance);
	router.get("/:id", controller.findById);
	router.patch("/:id", controller.update);
	router.delete("/:id", controller.remove);

	return router;
}
