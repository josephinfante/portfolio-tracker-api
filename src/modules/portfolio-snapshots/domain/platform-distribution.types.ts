export interface PlatformDistributionItemDto {
	platformId: string;
	name: string;
	valueUsd: number;
	valueBase: number;
	percentUsd: number;
}

export interface PlatformDistributionDto {
	asOfDate: string;
	baseCurrencyCode: string;
	fxUsdToBase: number;
	total: {
		valueUsd: number;
		valueBase: number;
	};
	items: PlatformDistributionItemDto[];
}
