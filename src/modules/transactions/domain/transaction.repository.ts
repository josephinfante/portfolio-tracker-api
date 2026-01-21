import { TransactionEntity } from "./transaction.entity";
import { TransactionDetailsRecord } from "./transaction-details.types";
import { CreateTransactionInput, TransactionListFilters } from "./transaction.types";
import { Drizzle } from "@shared/database/drizzle/client";
import type { NodePgTransaction } from "drizzle-orm/node-postgres";

export interface TransactionRepository {
	findById(id: string): Promise<TransactionEntity | null>;
	findDetailsById(id: string): Promise<TransactionDetailsRecord | null>;
	findByUserId(
		userId: string,
		options?: TransactionListFilters,
	): Promise<{ items: TransactionEntity[]; totalCount: number }>;

	create(data: CreateTransactionInput, db?: Drizzle | NodePgTransaction<any, any>): Promise<TransactionEntity>;
	getAssetBalance(userId: string, accountId: string, assetId: string): Promise<number>;
	runInTransaction<T>(handler: (tx: NodePgTransaction<any, any>) => Promise<T>): Promise<T>;
	reverse(
		id: string,
		reason: string | null,
		db?: Drizzle | NodePgTransaction<any, any>,
	): Promise<TransactionEntity>;
	adjust(id: string, newData: Partial<CreateTransactionInput>, reason: string | null): Promise<TransactionEntity>;
}
