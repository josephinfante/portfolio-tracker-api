export interface ExchangeRateEntity {
	id: string;

	baseCurrency: string;
	quoteCurrency: string;
	buyRate: number;
	sellRate: number;
	source: string;
	rateAt: number; // cuándo se obtuvo el rate

	createdAt: number; // unix timestamp
}
