import type { SortDirection } from "@shared/types/sort";

export enum AssetType {
	crypto = "crypto",
	fiat = "fiat",
	stock = "stock",
	etf = "etf",
	commodity = "commodity",
	stablecoin = "stablecoin",
}

export interface AssetListFilters {
	page?: number;
	pageSize?: number;
	search?: string;
	type?: AssetType;
	sortBy?: string;
	sortDirection?: SortDirection;
	[key: string]: any;
}

export interface CreateAssetInput {
	symbol: string;
	name: string;
	asset_type: AssetType;
	pricing_source: string | null;
	external_id: string | null;
	quote_currency: string | null;
}

export type UpdateAssetInput = Partial<CreateAssetInput>;
