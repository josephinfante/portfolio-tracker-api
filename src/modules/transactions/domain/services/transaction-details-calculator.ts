import { AssetType } from "@modules/assets/domain/asset.types";
import { TransactionEntity } from "@modules/transactions/domain/transaction.entity";
import { PlatformTypes } from "@modules/platforms/domain/platform.types";
import { TransactionDetailsResponse } from "@modules/transactions/application/dtos/transaction-details.response";
import { TransactionCorrectionType, TransactionType } from "@modules/transactions/domain/transaction.types";
import { D } from "@shared/helpers/decimal";

type TransactionDetailsAsset = {
	id: string;
	symbol: string;
	name: string;
	asset_type: AssetType;
	logoUrl?: string | null;
};

type TransactionDetailsFee = {
	transaction: TransactionEntity;
	asset: {
		id: string;
		symbol: string;
		name: string;
		asset_type: AssetType;
	};
};

export type TransactionDetailsInput = {
	transaction: TransactionEntity;
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
	asset: TransactionDetailsAsset;
	paymentAsset: TransactionDetailsAsset | null;
	fees: TransactionDetailsFee[];
	baseCurrency: string;
	exchangeRate: number | null;
	hasReverse: boolean;
};

const toSeconds = (value: number): number => {
	if (!Number.isFinite(value)) {
		return 0;
	}
	return value < 1_000_000_000_000 ? Math.trunc(value) : Math.trunc(value / 1000);
};

const toPositiveNumber = (value: number): number => {
	if (!Number.isFinite(value)) {
		return 0;
	}
	return Math.abs(value);
};

const buildCode = (id: string): string => {
	const normalized = id.replace(/-/g, "");
	const suffix = normalized.slice(-5).toUpperCase();
	return `TXN-${suffix || "00000"}`;
};

const resolveStatus = (): TransactionDetailsResponse["status"] => "settled";

const resolveAuditType = (correctionType: TransactionCorrectionType | null): "original" | "reverse" | "adjust" => {
	if (correctionType === TransactionCorrectionType.REVERSE) {
		return "reverse";
	}
	if (correctionType === TransactionCorrectionType.ADJUST) {
		return "adjust";
	}
	return "original";
};

const resolveAuditLabel = (auditType: "original" | "reverse" | "adjust"): string => {
	switch (auditType) {
		case "reverse":
			return "Reversed";
		case "adjust":
			return "Adjusted";
		default:
			return "Original";
	}
};

const isExchangeLike = (transactionType: TransactionType): boolean => {
	return (
		transactionType === TransactionType.BUY ||
		transactionType === TransactionType.SELL ||
		transactionType === TransactionType.FOREIGN_EXCHANGE
	);
};

const isFiatLike = (assetType: AssetType): boolean => {
	return assetType === AssetType.fiat || assetType === AssetType.stablecoin;
};

export const buildTransactionDetails = (input: TransactionDetailsInput): TransactionDetailsResponse => {
	const { transaction, account, asset, paymentAsset, fees, baseCurrency, exchangeRate } = input;

	const status = resolveStatus();
	const auditType = resolveAuditType(transaction.correctionType);
	const direction = transaction.quantity < 0 ? "outflow" : "inflow";

	const quantity = toPositiveNumber(transaction.quantity);
	const paymentQuantity = toPositiveNumber(transaction.paymentQuantity);
	const paymentSymbol = paymentAsset?.symbol ?? null;

	const feeItems = fees.map((fee) => ({
		asset: {
			id: fee.asset.id,
			symbol: fee.asset.symbol,
			name: fee.asset.name,
		},
		amount: toPositiveNumber(fee.transaction.quantity),
	}));

	const feeTotalInPaymentAsset = fees.reduce((total, fee) => {
		if (paymentAsset && fee.asset.id === paymentAsset.id) {
			return total + toPositiveNumber(fee.transaction.quantity);
		}
		return total;
	}, 0);

	const hasQuantity = quantity > 0;
	const hasPaymentQuantity = paymentQuantity > 0;
	const unitPrice =
		isExchangeLike(transaction.transactionType) && hasQuantity && hasPaymentQuantity
			? D(paymentQuantity).div(D(quantity)).toNumber()
			: null;

	const subtotal = isExchangeLike(transaction.transactionType) ? paymentQuantity : null;
	const total = isExchangeLike(transaction.transactionType)
		? subtotal !== null
			? D(subtotal).plus(D(feeTotalInPaymentAsset)).toNumber()
			: null
		: isFiatLike(asset.asset_type)
			? quantity
			: null;

	const totalQuote = total !== null ? paymentSymbol : null;
	const unitPriceQuote = unitPrice !== null ? paymentSymbol : null;

	const valueInBaseCurrency =
		total !== null && exchangeRate !== null ? D(total).mul(D(exchangeRate)).toNumber() : null;

	return {
		id: transaction.id,
		code: buildCode(transaction.id),
		status,
		transactionType: transaction.transactionType,
		transactionDate: toSeconds(transaction.transactionDate),
		createdAt: toSeconds(transaction.createdAt),
		direction,
		account: {
			id: account.id,
			name: account.name,
			currencyCode: account.currencyCode ?? null,
			platform: {
				id: account.platform.id,
				name: account.platform.name,
				type: account.platform.type,
			},
		},
		asset: {
			id: asset.id,
			symbol: asset.symbol,
			name: asset.name,
			asset_type: asset.asset_type,
			logoUrl: asset.logoUrl ?? null,
		},
		payment: paymentAsset
			? {
					asset: {
						id: paymentAsset.id,
						symbol: paymentAsset.symbol,
						name: paymentAsset.name,
						asset_type: paymentAsset.asset_type,
						logoUrl: paymentAsset.logoUrl ?? null,
					},
					quantity: paymentQuantity,
			  }
			: null,
		financial: {
			quantity,
			unitPrice,
			unitPriceQuote,
			subtotal,
			total,
			totalQuote,
			fees: feeItems,
		},
		conversion: {
			baseCurrency,
			exchangeRate,
			valueInBaseCurrency,
		},
		audit: {
			correctionType: auditType,
			referenceTxId: transaction.referenceTxId ?? null,
			label: resolveAuditLabel(auditType),
		},
		notes: transaction.notes ?? null,
		actions: {
			canReverse: auditType === "original" && !input.hasReverse && status === "settled",
			canAdjust: auditType !== "reverse" && !input.hasReverse && status === "settled",
		},
	};
};
