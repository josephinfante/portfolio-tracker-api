import { TOKENS } from "@shared/container/tokens";
import { container } from "tsyringe";
import { PortfolioSnapshotSqlRepository } from "./infrastructure/portfolio-snapshot-sql.repository";

export function registerPortfolioSnapshotModule(): void {
	container.registerSingleton(TOKENS.PortfolioSnapshotRepository, PortfolioSnapshotSqlRepository);
}
