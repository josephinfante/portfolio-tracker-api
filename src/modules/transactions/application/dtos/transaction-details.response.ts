import { AssetType } from "@modules/assets/domain/asset.types";
import { PlatformTypes } from "@modules/platforms/domain/platform.types";
import { TransactionType } from "@modules/transactions/domain/transaction.types";

export type TransactionDetailsStatus = "pending" | "settled" | "failed";
export type TransactionDirection = "inflow" | "outflow";
export type TransactionAuditType = "original" | "reverse" | "adjust";

export type TransactionDetailsResponse = {
	id: string;
	code: string;
	status: TransactionDetailsStatus;
	transactionType: TransactionType;
	transactionDate: number; // unix seconds
	createdAt: number; // unix seconds
	direction: TransactionDirection;
	account: {
		id: string;
		name: string;
		currencyCode: string | null;
		platform: {
			id: string;
			name: string;
			type: PlatformTypes;
		};
	};
	asset: {
		id: string;
		symbol: string;
		name: string;
		asset_type: AssetType;
		logoUrl?: string | null;
	};
	payment: {
		asset: {
			id: string;
			symbol: string;
			name: string;
			asset_type: AssetType;
			logoUrl?: string | null;
		};
		quantity: number;
	} | null;
	financial: {
		quantity: number;
		unitPrice: number | null;
		unitPriceQuote: string | null;
		subtotal: number | null;
		total: number | null;
		totalQuote: string | null;
		fees: Array<{
			asset: {
				id: string;
				symbol: string;
				name: string;
			};
			amount: number;
		}>;
	};
	conversion: {
		baseCurrency: string;
		exchangeRate: number | null;
		valueInBaseCurrency: number | null;
	};
	audit: {
		correctionType: TransactionAuditType;
		referenceTxId: string | null;
		label: string;
	};
	notes: string | null;
	actions: {
		canReverse: boolean;
		canAdjust: boolean;
	};
};
