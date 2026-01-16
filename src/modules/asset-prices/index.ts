import { TOKENS } from "@shared/container/tokens";
import { container } from "tsyringe";
import { AssetPriceSqlRepository } from "./infrastructure/asset-price-sql.repository";

export function registerAssetPriceModule(): void {
	container.registerSingleton(TOKENS.AssetPriceRepository, AssetPriceSqlRepository);
}
