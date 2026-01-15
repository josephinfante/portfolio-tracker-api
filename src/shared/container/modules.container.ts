import { registerAuthModule } from "@modules/auth";
import { createAuthApiRoutes } from "@modules/auth/infrastructure/http/api.routes";
import { registerAccountModule } from "@modules/accounts";
import { createAccountApiRoutes } from "@modules/accounts/infrastructure/http/api.routes";
import { registerAssetModule } from "@modules/assets";
import { createAssetApiRoutes } from "@modules/assets/infrastructure/http/api.routes";
import { registerTransactionModule } from "@modules/transactions";
import { createTransactionApiRoutes } from "@modules/transactions/infrastructure/http/api.routes";
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
	registerAssetModule();
	registerTransactionModule();
}

export function getModuleRouters(): { path: string; router: Router }[] {
	return [
		{ path: "/api/users", router: createApiUserRoutes() },
		{ path: "/api/auth", router: createAuthApiRoutes() },
		{ path: "/api/platforms", router: createPlatformApiRoutes() },
		{ path: "/api/accounts", router: createAccountApiRoutes() },
		{ path: "/api/assets", router: createAssetApiRoutes() },
		{ path: "/api/transactions", router: createTransactionApiRoutes() },
	];
}
