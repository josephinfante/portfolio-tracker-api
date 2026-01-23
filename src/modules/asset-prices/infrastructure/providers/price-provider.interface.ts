export interface TwelveDataQuoteItem {
	symbol: string;
	name: string;
	exchange: string;
	mic_code: string;
	currency: string;
	datetime: string;
	timestamp: number;
	last_quote_at: number;
	open: string;
	high: string;
	low: string;
	close: string;
	volume: string;
	previous_close: string;
	change: string;
	percent_change: string;
	average_volume: string;
	is_market_open: boolean;
	fifty_two_week: TwelveDataQuoteFiftyTwoWeek;
}

export interface TwelveDataQuoteFiftyTwoWeek {
	low: string;
	high: string;
	low_change: string;
	high_change: string;
	low_change_percent: string;
	high_change_percent: string;
	range: string;
}

export type TwelveDataQuoteResponse = TwelveDataQuoteItem | { [symbol: string]: TwelveDataQuoteItem };

export interface TwelveDataHistoricalMeta {
	symbol: string;
	interval: string;
	currency_base: string;
	currency_quote: string;
	exchange: string;
	type: string;
}

export interface TwelveDataHistoricalValue {
	datetime: string;
	open: string;
	high: string;
	low: string;
	close: string;
}

export interface TwelveDataHistoricalResponse {
	meta: TwelveDataHistoricalMeta;
	values: TwelveDataHistoricalValue[];
	status: string;
}

export interface AssetPriceProviderResponseMap {
	quote: unknown;
	historical: unknown;
}

export interface AssetPriceProvider<TMap extends AssetPriceProviderResponseMap> {
	name: string;
	getQuote(assetsSymbol: string[]): Promise<TMap["quote"] | null>;
	getHistorical?(assetSymbol: string, startAt: number, endAt: number): Promise<TMap["historical"] | null>;
}
