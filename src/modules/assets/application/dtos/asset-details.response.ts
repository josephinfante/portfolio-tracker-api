export type AssetDetailsResponse = {
	asset: {
		id: string;
		symbol: string;
		name: string;
		assetType: string;

		description?: string | null;
		logoUrl?: string | null;

		pricingSource?: string | null;
		externalId?: string | null;

		createdAt: number;
		updatedAt: number;
	};

	market: {
		quoteCurrency: string;
		price: number;

		changeAmount?: number | null;
		changePercent?: number | null;

		high?: number | null;
		low?: number | null;

		open?: number | null;
		previousClose?: number | null;

		volume?: number | null;
		marketCap?: number | null;
		marketCapRank?: number | null;

		isMarketOpen?: boolean | null;

		source: string;
		providerAssetKey?: string | null;

		updatedAt: number;
		providerUpdatedAt?: number | null;
	} | null;

	holdings: {
		baseCurrency: string;
		totalQuantity: number;

		avgBuyPrice?: number | null;
		totalEquity: number;

		unrealizedPnlAmount?: number | null;
		unrealizedPnlPercent?: number | null;
	};

	accounts: Array<{
		accountId: string;
		accountName: string;
		platform?: {
			id: string;
			name: string;
			type: string;
		};
		quantity: number;
		equity: number;
	}>;

	recentTransactions: Array<{
		id: string;
		transactionType: string;
		quantity: number;
		unitPrice?: number | null;
		executedAt: number;
		accountId: string;
	}>;
};
