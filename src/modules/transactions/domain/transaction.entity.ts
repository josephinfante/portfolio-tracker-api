import { TransactionCorrectionType, TransactionType } from "./transaction.types";

export interface TransactionEntity {
	id: string;
	userId: string;
	accountId: string;
	assetId: string;

	transactionType: TransactionType;
	correctionType: TransactionCorrectionType | null;
	referenceTxId: string | null;
	quantity: number;
	unitPrice: number | null;
	totalAmount: number;
	currencyCode: string;
	exchangeRate: number | null;
	transactionDate: number; // unix timestamp
	notes: string | null;

	createdAt: number; // unix timestamp

	account?: {
		id: string;
		name: string;
		currencyCode: string;
	};

	asset?: {
		id: string;
		symbol: string;
		name: string;
	};
}
