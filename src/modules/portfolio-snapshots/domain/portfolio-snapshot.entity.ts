export interface PorfolioSnapshot {
	id: string;
	userId: string;

	snapshotDate: Date;
	fxUsdToBase: number;

	totalValueUsd: number;
	totalValueBase: number;

	createdAt: number;
	updatedAt: number;
}

export interface PortfolioSnapshotItems {
	id: string;
	portfolioSnapshotId: string;
	accountId: string;
	assetId: string;

	quantity: number;
	priceUsd: number;
	priceBase: number;

	valueUsd: number;
	valueBase: number;

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
			currencyCode: string;
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
