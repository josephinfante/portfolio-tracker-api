import { registerUserModule } from "@modules/users";
import { createApiUserRoutes } from "@modules/users/infrastructure/http/api.routes";
import { Router } from "express";

export function registerAllModules() {
	registerUserModule();
}

export function getModuleRouters(): { path: string; router: Router }[] {
	return [{ path: "/api/users", router: createApiUserRoutes() }];
}
