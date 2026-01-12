// import { registerUserModule } from "@modules/users";
// import { createAdminUserRoutes } from "@modules/users/infrastructure/http/admin.routes";
// import { createApiUserRoutes } from "@modules/users/infrastructure/http/api.routes";
import { Router } from "express";

export function registerAllModules() {
	// registerUserModule();
}

export function getModuleRouters(): { path: string; router: Router }[] {
	// return [
	// 	{ path: "/api/users", router: createApiUserRoutes() },
	// 	{ path: "/admin/users", router: createAdminUserRoutes() },
	// ];
	return [];
}
