export interface PorfolioSnapshot {
	id: string;
	userId: string;

	snapshotDate: string;
	fxUsdToBase: string;

	totalValueUsd: string;
	totalValueBase: string;

	createdAt: number;
	updatedAt: number;
}

export interface PortfolioSnapshotItems {
	id: string;
	portfolioSnapshotId: string;
	accountId: string;
	assetId: string;

	quantity: string;
	priceUsd: string;
	priceBase: string;

	valueUsd: string;
	valueBase: string;

	createdAt: number;
}

export type BuiltSnapshot = {
	snapshotDate: string; // YYYY-MM-DD
	baseCurrencyCode: string;
	fxUsdToBase: number;
	totalValueUsd: number;
	totalValueBase: number;
	items: Array<{
		accountId: string;
		assetId: string;
		quantity: number;
		priceUsd: number;
		priceBase: number;
		valueUsd: number;
		valueBase: number;
	}>;
};

export type SnapshotDetail = Omit<PorfolioSnapshot, "userId"> & {
	platforms: Array<{
		id: string;
		name: string;
		type: string;
		accounts: Array<{
			id: string;
			name: string;
			currencyCode: string | null;
			assets: Array<{
				id: string;
				symbol: string;
				name: string;
				asset_type: string;
				quantity: number;
				priceUsd: number;
				priceBase: number;
				valueUsd: number;
				valueBase: number;
			}>;
		}>;
	}>;
};
