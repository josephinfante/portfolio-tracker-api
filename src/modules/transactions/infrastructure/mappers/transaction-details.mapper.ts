import { AssetType } from "@modules/assets/domain/asset.types";
import { TransactionDetailsRecord } from "@modules/transactions/domain/transaction-details.types";
import { PlatformTypes } from "@modules/platforms/domain/platform.types";
import { TransactionMapper } from "@modules/transactions/infrastructure/transaction.mappers";
import { transactionsTable } from "@modules/transactions/infrastructure/drizzle/transaction.schema";

type TransactionDetailsRow = {
	transaction: typeof transactionsTable.$inferSelect;
	account: {
		id: string;
		name: string;
		currencyCode: string | null;
	};
	platform: {
		id: string;
		name: string;
		type: string;
	};
	asset: {
		id: string;
		symbol: string;
		name: string;
		asset_type: string;
	};
	paymentAsset: {
		id: string;
		symbol: string;
		name: string;
		asset_type: string;
	};
};

type FeeRow = {
	transaction: typeof transactionsTable.$inferSelect;
	asset: {
		id: string;
		symbol: string;
		name: string;
		asset_type: string;
	};
};

export class TransactionDetailsMapper {
	static toRecord(row: TransactionDetailsRow, feeRows: FeeRow[]): TransactionDetailsRecord {
		const transaction = TransactionMapper.toEntity(row.transaction);

		return {
			transaction,
			account: {
				id: row.account.id,
				name: row.account.name,
				currencyCode: row.account.currencyCode ?? null,
				platform: {
					id: row.platform.id,
					name: row.platform.name,
					type: row.platform.type as PlatformTypes,
				},
			},
			asset: {
				id: row.asset.id,
				symbol: row.asset.symbol,
				name: row.asset.name,
				asset_type: row.asset.asset_type as AssetType,
				logoUrl: null,
			},
			paymentAsset: {
				id: row.paymentAsset.id,
				symbol: row.paymentAsset.symbol,
				name: row.paymentAsset.name,
				asset_type: row.paymentAsset.asset_type as AssetType,
				logoUrl: null,
			},
			fees: feeRows.map((fee) => ({
				transaction: TransactionMapper.toEntity(fee.transaction),
				asset: {
					id: fee.asset.id,
					symbol: fee.asset.symbol,
					name: fee.asset.name,
					asset_type: fee.asset.asset_type as AssetType,
				},
			})),
		};
	}
}
