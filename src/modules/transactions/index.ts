import { TOKENS } from "@shared/container/tokens";
import { container } from "tsyringe";
import { TransactionSqlRepository } from "./infrastructure/transaction-sql.repository";
import { GetHoldingsByAccountUseCase } from "./application/usecases/get-holdings-by-account.usecase";

export function registerTransactionModule(): void {
	container.registerSingleton(TOKENS.TransactionRepository, TransactionSqlRepository);
	container.registerSingleton(TOKENS.GetHoldingsByAccountUseCase, GetHoldingsByAccountUseCase);
}
