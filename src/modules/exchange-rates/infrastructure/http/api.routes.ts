import { Router } from "express";
import { container } from "tsyringe";
import { ExchangeRateController } from "./exchange-rate.controller";
import { authMiddleware } from "@bootstrap/middlewares/auth-middleware";

export function createExchangeRateApiRoutes() {
	const router = Router();
	const controller = container.resolve(ExchangeRateController);

	router.use(authMiddleware);

	router.get("/", controller.findAll);

	return router;
}
