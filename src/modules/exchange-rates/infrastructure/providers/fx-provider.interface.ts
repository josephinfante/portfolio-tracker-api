export type FxRateResult = {
	source: string;
	baseCurrency: string;
	quoteCurrency: string;
	buyRate: number;
	sellRate: number;
	rateAt: number;
};

export interface FxRateProvider {
	name: string;
	getRate(): Promise<FxRateResult | null>;
}
