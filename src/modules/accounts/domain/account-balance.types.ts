export type AccountBalanceResponse = {
	accountId: string;
	items: Array<{
		assetId: string;
		quantity: number;
		asset: {
			id: string;
			symbol: string;
			name: string;
		} | null;
	}>;
};
