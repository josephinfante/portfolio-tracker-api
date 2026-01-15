import { Router } from "express";
import { container } from "tsyringe";
import { TransactionController } from "./transaction.controller";
import { authMiddleware } from "@bootstrap/middlewares/auth-middleware";

export function createTransactionApiRoutes() {
	const router = Router();
	const controller = container.resolve(TransactionController);

	router.use(authMiddleware);

	router.post("/", controller.create);
	router.post("/list", controller.list);
	router.get("/:id", controller.findById);
	router.patch("/:id", controller.adjust);
	router.post("/:id/reverse", controller.reverse);
	router.post("/transfer", controller.transfer);
	router.post("/exchange", controller.exchange);
	router.post("/move", controller.move);

	return router;
}
