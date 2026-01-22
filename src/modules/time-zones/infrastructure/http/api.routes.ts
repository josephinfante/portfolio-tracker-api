import { Router } from "express";
import { container } from "tsyringe";
import { TimeZoneController } from "./time-zone.controller";

export function createTimeZoneApiRoutes() {
	const router = Router();
	const controller = container.resolve(TimeZoneController);

	router.get("/", controller.list);

	return router;
}
