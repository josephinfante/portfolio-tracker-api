import { injectable } from "tsyringe";
import { CreateAccountUseCase } from "./usecases/create-account.usecase";
import { UpdateAccountUseCase } from "./usecases/update-account.usecase";
import { DeleteAccountUseCase } from "./usecases/delete-account.usecase";
import { ListAccountsUseCase } from "./usecases/list-accounts.usecase";
import { FindAccountUseCase } from "./usecases/find-account.usecase";
import { AccountEntity } from "../domain/account.entity";
import { AccountListFilters } from "../domain/account.types";
import { PaginatedResponse } from "@shared/types/paginated-response";
import { GetAccountBalanceUseCase } from "./usecases/get-account-balance.usecase";
import { AccountBalanceResponse } from "../domain/account-balance.types";
import { GetAccountHoldingsUseCase } from "./usecases/get-account-holdings.usecase";
import { AccountHoldingsResponseDTO } from "../domain/account-holdings.types";
import { TransactionService } from "@modules/transactions/application/transaction.service";
import { TransactionEntity } from "@modules/transactions/domain/transaction.entity";
import { TransactionListFilters } from "@modules/transactions/domain/transaction.types";

@injectable()
export class AccountService {
	constructor(
		private createAccountUseCase: CreateAccountUseCase,
		private updateAccountUseCase: UpdateAccountUseCase,
		private deleteAccountUseCase: DeleteAccountUseCase,
		private listAccountsUseCase: ListAccountsUseCase,
		private findAccountUseCase: FindAccountUseCase,
		private getAccountBalanceUseCase: GetAccountBalanceUseCase,
		private getAccountHoldingsUseCase: GetAccountHoldingsUseCase,
		private transactionService: TransactionService,
	) {}

	async createAccount(userId: string, input: unknown): Promise<AccountEntity> {
		return await this.createAccountUseCase.execute(userId, input);
	}

	async updateAccount(id: string, userId: string, input: unknown): Promise<AccountEntity> {
		return await this.updateAccountUseCase.execute(id, userId, input);
	}

	async deleteAccount(id: string, userId: string): Promise<void> {
		await this.deleteAccountUseCase.execute(id, userId);
	}

	async listAccounts(userId: string, options?: AccountListFilters): Promise<PaginatedResponse<AccountEntity>> {
		return await this.listAccountsUseCase.execute(userId, options);
	}

	async findAccount(id: string, userId: string): Promise<AccountEntity> {
		return await this.findAccountUseCase.execute(id, userId);
	}

	async getAccountBalance(userId: string, accountId: string): Promise<AccountBalanceResponse> {
		return await this.getAccountBalanceUseCase.execute(userId, accountId);
	}

	async getAccountHoldings(
		userId: string,
		accountId: string,
		quoteCurrency?: string,
	): Promise<AccountHoldingsResponseDTO> {
		return await this.getAccountHoldingsUseCase.execute(userId, accountId, quoteCurrency);
	}

	async listAccountTransactions(
		userId: string,
		accountId: string,
		options?: TransactionListFilters,
	): Promise<PaginatedResponse<TransactionEntity>> {
		return await this.transactionService.listTransactions(userId, { ...options, account: accountId });
	}
}
