import { Router } from "express";
import { container } from "tsyringe";
import { CurrencyController } from "./currency.controller";

export function createCurrencyApiRoutes() {
	const router = Router();
	const controller = container.resolve(CurrencyController);

	router.get("/", controller.list);

	return router;
}
