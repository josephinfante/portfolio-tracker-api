import { TOKENS } from "@shared/container/tokens";
import { container } from "tsyringe";
import { AssetSqlRepository } from "./infrastructure/asset-sql.repository";

export function registerAssetModule(): void {
	container.registerSingleton(TOKENS.AssetRepository, AssetSqlRepository);
}
