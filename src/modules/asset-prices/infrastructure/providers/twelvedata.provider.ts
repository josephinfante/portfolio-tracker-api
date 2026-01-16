import axios from "axios";
import { AssetPriceProvider, TwelveDataHistoricalResponse, TwelveDataQuoteResponse } from "./price-provider.interface";
import { environment } from "@shared/config/environment";

type TwelveDataResponseMap = {
	quote: TwelveDataQuoteResponse;
	historical: TwelveDataHistoricalResponse;
};

export class TwelvedataProvider implements AssetPriceProvider<TwelveDataResponseMap> {
	name = "Twelvedata";

	async getQuote(assetsSymbol: string[]): Promise<TwelveDataQuoteResponse | null> {
		try {
			const { data } = await axios.get(
				`https://api.twelvedata.com/quote?symbol=${assetsSymbol.join(",")}&interval=1min&apikey=${environment.STOCK_PROVIDER_API_KEY}`,
			);
			return data;
		} catch (error) {
			return null;
		}
	}

	async getHistorical(
		assetSymbol: string,
		startAt: number,
		endAt: number,
	): Promise<TwelveDataHistoricalResponse | null> {
		try {
			// convert timestamps to YYYY-MM-DDTHH:mm:ss format
			// Start date should be in time to the start of the day
			const startDate = new Date(startAt);
			startDate.setHours(0, 0, 0, 0);
			const endDate = new Date(endAt);
			endDate.setHours(23, 59, 59, 999);

			const startStr = startDate.toISOString().split(".")[0];
			const endStr = endDate.toISOString().split(".")[0];

			const { data } = await axios.get(
				`https://api.twelvedata.com/time_series?symbol=${assetSymbol}&interval=1day&start_date=${startStr}&end_date=${endStr}&apikey=${environment.STOCK_PROVIDER_API_KEY}`,
			);
			return data;
		} catch (error) {
			return null;
		}
	}
}
