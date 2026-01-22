export type PortfolioMetricsResponse = {
	asOfDate: string; // YYYY-MM-DD
	baseCurrencyCode: string;
	fxUsdToBase: number;

	netWorth: {
		usd: number;
		base: number;
	};

	dailyPnL: {
		usd: number;
		base: number;
		percentUsd: number;
	};

	dailyPnLReal: {
		usd: number;
		base: number;
		percentUsd: number;
		netCashFlowUsd: number;
	};

	totalInvested: {
		usd: number;
		base: number;
	};

	cashBalance?: {
		usd: number;
		base: number;
	};
};
