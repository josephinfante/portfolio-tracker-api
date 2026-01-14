import { AssetType } from "./asset.types";

export interface AssetEntity {
	id: string;
	userId: string;

	symbol: string;
	name: string;
	asset_type: AssetType;

	pricing_source: string | null;
	external_id: string | null;
	quote_currency: string | null;

	createdAt: number; // unix timestamp
	updatedAt: number; // unix timestamp
}
