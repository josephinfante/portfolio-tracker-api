import { TOKENS } from "@shared/container/tokens";
import { container } from "tsyringe";
import { PlatformSqlRepository } from "./infrastructure/platform-sql.repository";

export function registerPlatformModule(): void {
	container.registerSingleton(TOKENS.PlatformRepository, PlatformSqlRepository);
}
