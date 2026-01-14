import { registerAuthModule } from "@modules/auth";
import { createAuthApiRoutes } from "@modules/auth/infrastructure/http/api.routes";
import { registerAccountModule } from "@modules/accounts";
import { createAccountApiRoutes } from "@modules/accounts/infrastructure/http/api.routes";
import { registerPlatformModule } from "@modules/platforms";
import { createPlatformApiRoutes } from "@modules/platforms/infrastructure/http/api.routes";
import { registerUserModule } from "@modules/users";
import { createApiUserRoutes } from "@modules/users/infrastructure/http/api.routes";
import { Router } from "express";

export function registerAllModules() {
	registerUserModule();
	registerAuthModule();
	registerPlatformModule();
	registerAccountModule();
}

export function getModuleRouters(): { path: string; router: Router }[] {
	return [
		{ path: "/api/users", router: createApiUserRoutes() },
		{ path: "/api/auth", router: createAuthApiRoutes() },
		{ path: "/api/platforms", router: createPlatformApiRoutes() },
		{ path: "/api/accounts", router: createAccountApiRoutes() },
	];
}
