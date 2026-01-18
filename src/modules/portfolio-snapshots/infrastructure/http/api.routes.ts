import { Router } from "express";
import { container } from "tsyringe";
import { PortfolioSnapshotController } from "./portfolio-snapshot.controller";
import { authMiddleware } from "@bootstrap/middlewares/auth-middleware";

export function createPortfolioSnapshotApiRoutes() {
	const router = Router();
	const controller = container.resolve(PortfolioSnapshotController);

	router.use(authMiddleware);

	router.get("/", controller.list);
	router.post("/today", controller.createToday);
	router.get("/:id", controller.findById);

	return router;
}
