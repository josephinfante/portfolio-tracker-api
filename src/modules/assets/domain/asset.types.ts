export enum AssetType {
	crypto = "crypto",
	fiat = "fiat",
	stock = "stock",
	etf = "etf",
	commodity = "commodity",
	stablecoin = "stablecoin",
}

export interface AssetListFilters {
	limit?: number;
	offset?: number;
	page?: number;
	search?: string;
	type?: AssetType;
	[key: string]: any;
}

export interface CreateAssetInput {
	userId: string;
	symbol: string;
	name: string;
	asset_type: AssetType;
	pricing_source: string | null;
	external_id: string | null;
	quote_currency: string | null;
}

export type UpdateAssetInput = Partial<Omit<CreateAssetInput, "userId">>;
