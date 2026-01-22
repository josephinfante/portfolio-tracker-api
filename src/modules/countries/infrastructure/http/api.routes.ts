import { Router } from "express";
import { container } from "tsyringe";
import { CountryController } from "./country.controller";

export function createCountryApiRoutes() {
	const router = Router();
	const controller = container.resolve(CountryController);

	router.get("/", controller.list);

	return router;
}
