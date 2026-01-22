import { AssetType } from "@modules/assets/domain/asset.types";
import { TransactionEntity } from "./transaction.entity";
import { PlatformTypes } from "@modules/platforms/domain/platform.types";

export type TransactionDetailsRecord = {
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
	asset: {
		id: string;
		symbol: string;
		name: string;
		asset_type: AssetType;
		logoUrl?: string | null;
	};
	paymentAsset: {
		id: string;
		symbol: string;
		name: string;
		asset_type: AssetType;
		logoUrl?: string | null;
	};
	fees: Array<{
		transaction: TransactionEntity;
		asset: {
			id: string;
			symbol: string;
			name: string;
			asset_type: AssetType;
		};
	}>;
};
