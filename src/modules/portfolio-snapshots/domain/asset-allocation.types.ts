export type AllocationType = "stocks" | "crypto" | "fiat";

export interface AllocationItemDto {
	type: AllocationType;
	label: string;
	valueUsd: number;
	valueBase: number;
	percentUsd: number;
}

export interface AssetAllocationDto {
	asOfDate: string;
	baseCurrencyCode: string;
	fxUsdToBase: number;
	total: {
		valueUsd: number;
		valueBase: number;
	};
	items: AllocationItemDto[];
}
