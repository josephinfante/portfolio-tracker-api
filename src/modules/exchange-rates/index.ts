import { TOKENS } from "@shared/container/tokens";
import { container } from "tsyringe";
import { ExchangeRateSqlRepository } from "./infrastructure/exchange-rate-sql.repository";

export function registerExchangeRateModule(): void {
	container.registerSingleton(TOKENS.ExchangeRateRepository, ExchangeRateSqlRepository);
}
