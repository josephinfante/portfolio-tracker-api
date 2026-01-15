import axios from "axios";
import { FxRateProvider, FxRateResult } from "./fx-provider.interface";

export class DecamoneyProvider implements FxRateProvider {
	name = "Decamoney";

	async getRate(): Promise<FxRateResult | null> {
		try {
			const { data } = await axios.get("https://api.decamoney.com/v1/rates");

			if (!data.exchange_rate.buy && !data.exchange_rate.sell) {
				return null;
			}

			return {
				source: "Decamoney",
				baseCurrency: "USD",
				quoteCurrency: "PEN",
				buyRate: Number(data.exchange_rate.buy),
				sellRate: Number(data.exchange_rate.sell),
				rateAt: Date.now(),
			};
		} catch (error) {
			return null;
		}
	}
}
