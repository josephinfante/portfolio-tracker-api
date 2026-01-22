export interface MoneyDTO {
	amount: number;
	currency: string;
}

export interface HoldingPriceDTO {
	amount: number;
	currency: string;
	source: string;
	priceAt: number;
}

export interface AccountHoldingItemDTO {
	assetId: string;
	asset: {
		id: string;
		symbol: string;
		name: string;
		assetType: "fiat" | "crypto" | "stock" | "etf" | "commodity" | "stablecoin";
	};
	quantity: number;
	price: HoldingPriceDTO;
	value: MoneyDTO;
	nativeValue?: MoneyDTO;
	costBasis?: MoneyDTO;
	unrealizedPnl?: {
		amount: number;
		currency: string;
		percent: number;
	};
	allocationPercent: number;
}

export interface AllocationByTypeItemDTO {
	assetType: "fiat" | "crypto" | "stock" | "etf" | "commodity" | "stablecoin";
	value: MoneyDTO;
	percent: number;
}

export interface AccountHoldingsSummaryDTO {
	totalValue: MoneyDTO;
	cashValue?: MoneyDTO;
	investedValue?: MoneyDTO;
	allocationByType: AllocationByTypeItemDTO[];
}

export interface AccountHoldingsResponseDTO {
	accountId: string;
	quoteCurrency: string;
	items: AccountHoldingItemDTO[];
	summary: AccountHoldingsSummaryDTO;
}
