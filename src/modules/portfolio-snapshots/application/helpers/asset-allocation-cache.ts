export const buildAssetAllocationCacheKey = (userId: string, baseCurrencyCode: string): string => {
	return `asset_allocation:${userId}:${baseCurrencyCode}`;
};

export const buildAssetAllocationCachePattern = (userId: string): string => {
	return `asset_allocation:${userId}:*`;
};
