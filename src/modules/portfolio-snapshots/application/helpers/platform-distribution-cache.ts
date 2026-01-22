export const buildPlatformDistributionCacheKey = (userId: string, baseCurrencyCode: string): string => {
	return `platform_distribution:${userId}:${baseCurrencyCode}`;
};
