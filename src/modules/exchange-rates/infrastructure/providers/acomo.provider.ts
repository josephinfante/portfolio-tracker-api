import axios from "axios";
import { FxRateProvider, FxRateResult } from "./fx-provider.interface";

export class AcomoProvider implements FxRateProvider {
	name = "Acomo";

	async getRate(): Promise<FxRateResult | null> {
		try {
			const { data } = await axios.get("https://acomo.com.pe/api/current_change");

			if (!data.BID || !data.OFFER) {
				return null;
			}

			return {
				source: "Acomo",
				baseCurrency: "USD",
				quoteCurrency: "PEN",
				buyRate: Number(data.BID),
				sellRate: Number(data.OFFER),
				rateAt: Date.now(),
			};
		} catch (error) {
			return null;
		}
	}
}
