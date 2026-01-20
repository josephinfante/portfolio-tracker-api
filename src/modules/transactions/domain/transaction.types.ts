export enum TransactionType {
	BUY = "buy",
	SELL = "sell",

	DEPOSIT = "deposit",
	WITHDRAW = "withdraw",

	TRANSFER_IN = "transfer_in",
	TRANSFER_OUT = "transfer_out",

	INTEREST = "interest", // intereses (USDC, savings)
	REWARD = "reward", // staking, cashback, mining
	DIVIDEND = "dividend", // acciones / ETFs

	FOREIGN_EXCHANGE = "foreign_exchange", // conversiones entre monedas

	FEE = "fee",
	ADJUSTMENT = "adjustment",
}

export type Holding = {
	accountId: string;
	assetId: string;
	quantity: number; // decimal
};

export enum TransactionCorrectionType {
	REVERSE = "reverse",
	ADJUST = "adjust",
}

export interface CreateTransactionInput {
	userId: string;
	accountId: string;
	assetId: string;

	transactionType: TransactionType;
	correctionType: TransactionCorrectionType | null;
	referenceTxId: string | null;
	quantity: string;
	totalAmount: string;
	paymentAssetId: string;
	paymentQuantity: string;
	exchangeRate: string | null;
	transactionDate: number; // unix timestamp
	notes: string | null;
}

export interface TransactionListFilters {
	limit?: number;
	offset?: number;
	page?: number;
	account?: string;
	asset?: string;
	transactionType?: TransactionType;
	correctionType?: TransactionCorrectionType;
	referenceTxId?: string;
	quantityMin?: number;
	quantityMax?: number;
	totalAmountMin?: number;
	totalAmountMax?: number;
	paymentAssetId?: string;
	paymentQuantityMin?: number;
	paymentQuantityMax?: number;
	startDate?: number; // unix timestamp
	endDate?: number; // unix timestamp
	[key: string]: any;
}
