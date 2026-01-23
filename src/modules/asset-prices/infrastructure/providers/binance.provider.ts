import axios from "axios";
import { AssetPriceProvider, TwelveDataQuoteItem, TwelveDataQuoteResponse } from "./price-provider.interface";

export type BinanceTickerResponseItem = {
	symbol: string;
	priceChange: string;
	priceChangePercent: string;
	weightedAvgPrice: string;
	openPrice: string;
	highPrice: string;
	lowPrice: string;
	lastPrice: string;
	volume: string;
	quoteVolume: string;
	openTime: number;
	closeTime: number;
	firstId: number;
	lastId: number;
	count: number;
};

export type BinanceTickerResponse = BinanceTickerResponseItem | BinanceTickerResponseItem[];

type BinanceResponseMap = {
	quote: TwelveDataQuoteResponse;
	historical: null;
};

export class BinanceProvider implements AssetPriceProvider<BinanceResponseMap> {
	name = "Binance";

	async getQuote(assetsSymbol: string[]): Promise<TwelveDataQuoteResponse | null> {
		if (!assetsSymbol.length) {
			return null;
		}

		try {
			const symbols = encodeURIComponent(JSON.stringify(assetsSymbol));
			const { data } = await axios.get<BinanceTickerResponse>(
				`https://api.binance.com/api/v3/ticker?symbols=${symbols}`,
			);

			const items = Array.isArray(data) ? data : [data];
			const map: Record<string, TwelveDataQuoteItem> = {};

			for (const item of items) {
				if (!item || typeof item !== "object" || !item.symbol) {
					continue;
				}

				const timestamp = Number.isFinite(item.closeTime) ? item.closeTime : Date.now();
				const price = item.lastPrice ?? "0";

				map[item.symbol] = {
					symbol: item.symbol,
					name: item.symbol,
					exchange: "",
					mic_code: "",
					currency: "USD",
					datetime: new Date(timestamp).toISOString(),
					timestamp,
					last_quote_at: timestamp,
					open: item.openPrice ?? price,
					high: item.highPrice ?? price,
					low: item.lowPrice ?? price,
					close: price,
					volume: item.volume ?? "0",
					previous_close: item.openPrice ?? price,
					change: item.priceChange ?? "0",
					percent_change: item.priceChangePercent ?? "0",
					average_volume: item.weightedAvgPrice ?? "0",
					is_market_open: true,
					fifty_two_week: {
						low: "0",
						high: "0",
						low_change: "0",
						high_change: "0",
						low_change_percent: "0",
						high_change_percent: "0",
						range: "0",
					},
				};
			}

			return Object.keys(map).length ? map : null;
		} catch {
			return null;
		}
	}
}
