import { TOKENS } from "@shared/container/tokens";
import { container } from "tsyringe";
import { TransactionSqlRepository } from "./infrastructure/transaction-sql.repository";

export function registerTransactionModule(): void {
	container.registerSingleton(TOKENS.TransactionRepository, TransactionSqlRepository);
}
