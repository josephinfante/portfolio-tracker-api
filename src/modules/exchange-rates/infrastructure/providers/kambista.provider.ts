import axios from "axios";
import { FxRateProvider, FxRateResult } from "./fx-provider.interface";

export class KambistaProvider implements FxRateProvider {
	name = "Kambista";

	async getRate(): Promise<FxRateResult | null> {
		try {
			const { data } = await axios.get("https://api.kambista.com/v1/utils/exchange");

			if (!data.bid && !data.ask) {
				return null;
			}

			return {
				source: "Kambista",
				baseCurrency: "USD",
				quoteCurrency: "PEN",
				buyRate: Number(data.bid),
				sellRate: Number(data.ask),
				rateAt: Date.now(),
			};
		} catch (error) {
			return null;
		}
	}
}
