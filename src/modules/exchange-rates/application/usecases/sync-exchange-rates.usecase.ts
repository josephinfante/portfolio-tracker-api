import { CreateExchangeRateInput } from "@modules/exchange-rates/domain/exchange-rate.types";
import { FxRateProvider, FxRateResult } from "@modules/exchange-rates/infrastructure/providers/fx-provider.interface";
import { AcomoProvider } from "@modules/exchange-rates/infrastructure/providers/acomo.provider";
import { DecamoneyProvider } from "@modules/exchange-rates/infrastructure/providers/decamoney.provider";
import { KambistaProvider } from "@modules/exchange-rates/infrastructure/providers/kambista.provider";
import { injectable } from "tsyringe";

type ProviderResult = { provider: FxRateProvider; rate: FxRateResult };

const isValidRate = (rate: FxRateResult | null): rate is FxRateResult => {
	return (
		!!rate &&
		Number.isFinite(rate.buyRate) &&
		Number.isFinite(rate.sellRate) &&
		typeof rate.baseCurrency === "string" &&
		typeof rate.quoteCurrency === "string"
	);
};

@injectable()
export class SyncExchangeRatesUseCase {
	private providers: FxRateProvider[] = [new AcomoProvider(), new DecamoneyProvider(), new KambistaProvider()];

	async execute(): Promise<CreateExchangeRateInput | null> {
		const results = await Promise.allSettled(this.providers.map((provider) => provider.getRate()));
		const valid: ProviderResult[] = [];

		results.forEach((result, index) => {
			if (result.status === "fulfilled" && isValidRate(result.value)) {
				valid.push({ provider: this.providers[index], rate: result.value });
			}
		});

		if (!valid.length) {
			return null;
		}

		const baseCurrency = valid[0].rate.baseCurrency;
		const quoteCurrency = valid[0].rate.quoteCurrency;
		const normalized = valid.filter(
			({ rate }) => rate.baseCurrency === baseCurrency && rate.quoteCurrency === quoteCurrency,
		);

		if (!normalized.length) {
			return null;
		}

		const buyRateSum = normalized.reduce((acc, { rate }) => acc + rate.buyRate, 0);
		const sellRateSum = normalized.reduce((acc, { rate }) => acc + rate.sellRate, 0);

		const buyRate = buyRateSum / normalized.length;
		const sellRate = sellRateSum / normalized.length;
		// const source = normalized.map(({ provider }) => provider.name).join(":");
		const rateAt = normalized.reduce((acc, { rate }) => Math.max(acc, rate.rateAt), 0);

		return {
			baseCurrency,
			quoteCurrency,
			buyRate,
			sellRate,
			source: "avg",
			rateAt,
		};
	}
}
