export const buildAccountHoldingsCacheKey = (userId: string, accountId: string, quoteCurrency: string): string => {
	return `accounts:${userId}:${accountId}:holdings:${quoteCurrency}`;
};

export const buildAccountHoldingsCachePattern = (userId: string, accountId: string): string => {
	return `accounts:${userId}:${accountId}:holdings:*`;
};
