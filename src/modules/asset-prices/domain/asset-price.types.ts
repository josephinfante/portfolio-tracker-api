export interface CreateAssetPriceInput {
	assetId: string;
	quoteCurrency: string;
	price: number;
	source: string;
	priceAt: number;
}

export interface FindAssetPriceOptions {
	assets?: string[];
	quoteCurrencies?: string[];
	startAt?: number;
	endAt?: number;
	sources?: string[];
	[key: string]: any;
}

export interface FindAssetPricesResponse {
	items: {
		asset: {
			id: string;
			name: string;
			symbol: string;
		};
		quoteCurrency: string;
		prices: {
			price: number;
			source: string;
			priceAt: number;
		}[];
	}[];
	totalCount: number;
}

export interface AssetPriceLiveCache {
	assetId: string; // uuid interno
	symbol: string; // BTC, ETH, SPY, AAPL
	name?: string; // opcional

	quoteCurrency: string; // "USD"

	price: number; // current price (number)

	changeAmount?: number; // variación absoluta (ej: -1920.57)
	changePercent?: number; // variación % (ej: -1.974)

	high?: number; // high del periodo (24h para crypto, day para stocks si aplica)
	low?: number; // low del periodo

	open?: number; // opcional (si provider lo trae)
	previousClose?: number; // opcional (stocks)

	volume?: number; // opcional

	marketCap?: number; // opcional (crypto)
	marketCapRank?: number; // opcional (crypto)

	isMarketOpen?: boolean; // útil para stocks/ETF

	source: string;

	providerAssetKey?: string; // "bitcoin" (coingecko id) o "AAPL" (ticker)
	updatedAt: number; // timestamp ms (cuando lo cacheaste)
	providerUpdatedAt?: number; // timestamp ms (si provider lo manda)
}

export interface AssetPriceLiveCacheResponse {
	items: AssetPriceLiveCache[];
	totalCount: number;
}

export interface AssetPriceRangeResponse {
	items: {
		price: number;
		source: string;
		priceAt: number;
	}[];
	totalCount: number;
}
