import { injectable } from "tsyringe";
import { CreateTransactionUseCase } from "./usecases/create-transaction.usecase";
import { ListTransactionsUseCase } from "./usecases/list-transactions.usecase";
import { FindTransactionUseCase } from "./usecases/find-transaction.usecase";
import { AdjustTransactionUseCase } from "./usecases/adjust-transaction.usecase";
import { ReverseTransactionUseCase } from "./usecases/reverse-transaction.usecase";
import { TransferAssetUseCase } from "./usecases/transfer-asset.usecase";
import { ExchangeAssetUseCase } from "./usecases/exchange-asset.usecase";
import { MoveAssetUseCase } from "./usecases/move-asset.usecase";
import { TransactionEntity } from "../domain/transaction.entity";
import { TransactionListFilters } from "../domain/transaction.types";
import { PaginatedResponse } from "@shared/types/paginated-response";

@injectable()
export class TransactionService {
	constructor(
		private createTransactionUseCase: CreateTransactionUseCase,
		private listTransactionsUseCase: ListTransactionsUseCase,
		private findTransactionUseCase: FindTransactionUseCase,
		private adjustTransactionUseCase: AdjustTransactionUseCase,
		private reverseTransactionUseCase: ReverseTransactionUseCase,
		private transferAssetUseCase: TransferAssetUseCase,
		private exchangeAssetUseCase: ExchangeAssetUseCase,
		private moveAssetUseCase: MoveAssetUseCase,
	) {}

	async createTransaction(userId: string, input: unknown): Promise<TransactionEntity> {
		return await this.createTransactionUseCase.execute(userId, input);
	}

	async listTransactions(
		userId: string,
		options?: TransactionListFilters,
	): Promise<PaginatedResponse<TransactionEntity>> {
		return await this.listTransactionsUseCase.execute(userId, options);
	}

	async findTransaction(id: string, userId: string): Promise<TransactionEntity> {
		return await this.findTransactionUseCase.execute(id, userId);
	}

	async adjustTransaction(id: string, userId: string, input: unknown): Promise<TransactionEntity> {
		return await this.adjustTransactionUseCase.execute(id, userId, input);
	}

	async reverseTransaction(id: string, userId: string, input: unknown): Promise<TransactionEntity> {
		return await this.reverseTransactionUseCase.execute(id, userId, input);
	}

	async transferAsset(userId: string, input: unknown): Promise<TransactionEntity> {
		return await this.transferAssetUseCase.execute(userId, input);
	}

	async exchangeAsset(userId: string, input: unknown): Promise<TransactionEntity> {
		return await this.exchangeAssetUseCase.execute(userId, input);
	}

	async moveAsset(userId: string, input: unknown): Promise<TransactionEntity> {
		return await this.moveAssetUseCase.execute(userId, input);
	}
}
