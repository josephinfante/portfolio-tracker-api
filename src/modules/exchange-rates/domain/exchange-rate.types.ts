export interface CreateExchangeRateInput {
	baseCurrency: string;
	quoteCurrency: string;
	buyRate: number;
	sellRate: number;
	source: string;
	rateAt: number;
}

export interface FindExchangeRatesOptions {
	baseCurrency?: string;
	quoteCurrency?: string;
	source?: string;
	startRateAt?: number;
	endRateAt?: number;
	[key: string]: any;
}

export interface FindExchangeRatesResponse {
	items: {
		baseCurrency: string;
		quoteCurrency: string;
		rates: {
			buyRate: number;
			sellRate: number;
			source: string;
			rateAt: number;
		}[];
	}[];
	totalCount: number;
}
