import { TOKENS } from "@shared/container/tokens";
import { container } from "tsyringe";
import { AccountSqlRepository } from "./infrastructure/account-sql.repository";

export function registerAccountModule(): void {
	container.registerSingleton(TOKENS.AccountRepository, AccountSqlRepository);
}
