import { TransactionEntity } from "../domain/transaction.entity";
import { TransactionCorrectionType, TransactionType } from "../domain/transaction.types";
import { transactionsTable } from "./drizzle/transaction.schema";

const toNumber = (value: unknown): number => {
	if (typeof value === "number") {
		return value;
	}
	if (typeof value === "string" && value.length) {
		return Number(value);
	}
	return 0;
};

const toNullableNumber = (value: unknown): number | null => {
	if (value === null || value === undefined) {
		return null;
	}
	return toNumber(value);
};

export class TransactionMapper {
	static toEntity(row: typeof transactionsTable.$inferSelect): TransactionEntity {
		return {
			id: row.id,
			userId: row.userId,
			accountId: row.accountId,
			assetId: row.assetId,
			transactionType: row.transactionType as TransactionType,
			correctionType: row.correctionType as TransactionCorrectionType | null,
			referenceTxId: row.referenceTxId ?? null,
			quantity: toNumber(row.quantity),
			unitPrice: toNullableNumber(row.unitPrice),
			totalAmount: toNumber(row.totalAmount),
			currencyCode: row.currencyCode,
			exchangeRate: toNullableNumber(row.exchangeRate),
			transactionDate: row.transactionDate,
			notes: row.notes ?? null,
			createdAt: row.createdAt,
		};
	}

	static toEntityList(rows: (typeof transactionsTable.$inferSelect)[]): TransactionEntity[] {
		return rows.map((row) => this.toEntity(row));
	}

	static toEntityWithDetails(row: {
		transaction: typeof transactionsTable.$inferSelect;
		account: { id: string; name: string; currencyCode: string };
		asset: { id: string; symbol: string; name: string };
	}): TransactionEntity {
		return {
			...this.toEntity(row.transaction),
			account: {
				id: row.account.id,
				name: row.account.name,
				currencyCode: row.account.currencyCode,
			},
			asset: {
				id: row.asset.id,
				symbol: row.asset.symbol,
				name: row.asset.name,
			},
		};
	}

	static toEntityListWithDetails(
		rows: {
			transaction: typeof transactionsTable.$inferSelect;
			account: { id: string; name: string; currencyCode: string };
			asset: { id: string; symbol: string; name: string };
		}[],
	): TransactionEntity[] {
		return rows.map((row) => this.toEntityWithDetails(row));
	}
}
