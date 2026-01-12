import { registerInfrastructure } from "./infrastructure.container";
import { registerAllModules } from "./modules.container";

export function registerContainer() {
	registerInfrastructure();
	registerAllModules();
}
