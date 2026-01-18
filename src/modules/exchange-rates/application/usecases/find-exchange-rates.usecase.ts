import { ExchangeRateRepository } from "@modules/exchange-rates/domain/exchange-rate.repository";
import {
	FindExchangeRatesOptions,
	FindExchangeRatesResponse,
} from "@modules/exchange-rates/domain/exchange-rate.types";
import { TOKENS } from "@shared/container/tokens";
import { ValidationError } from "@shared/errors/domain/validation.error";
import { inject, injectable } from "tsyringe";

const normalizeCurrencyCode = (value: string) => value.trim().toUpperCase();

const parseNumber = (value: unknown) => {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}
	if (typeof value === "string" && value.trim().length) {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : undefined;
	}
	return undefined;
};

const groupExchangeRates = (response: FindExchangeRatesResponse): FindExchangeRatesResponse => {
	const grouped = new Map<
		string,
		{
			baseCurrency: string;
			quoteCurrency: string;
			rates: { buyRate: number; sellRate: number; source: string; rateAt: number }[];
		}
	>();

	for (const item of response.items) {
		const key = `${item.baseCurrency}:${item.quoteCurrency}`;
		const existing = grouped.get(key);
		if (existing) {
			existing.rates.push(...item.rates);
		} else {
			grouped.set(key, {
				baseCurrency: item.baseCurrency,
				quoteCurrency: item.quoteCurrency,
				rates: [...item.rates],
			});
		}
	}

	const items = Array.from(grouped.values())
		.sort((a, b) => {
			const baseCompare = a.baseCurrency.localeCompare(b.baseCurrency);
			return baseCompare !== 0 ? baseCompare : a.quoteCurrency.localeCompare(b.quoteCurrency);
		})
		.map((item) => ({
			...item,
			rates: item.rates.sort((a, b) => {
				const rateCompare = b.rateAt - a.rateAt;
				return rateCompare !== 0 ? rateCompare : a.source.localeCompare(b.source);
			}),
		}));

	return { items, totalCount: response.totalCount };
};

@injectable()
export class FindExchangeRatesUseCase {
	constructor(@inject(TOKENS.ExchangeRateRepository) private exchangeRateRepository: ExchangeRateRepository) {}

	async execute(userId: string, options?: FindExchangeRatesOptions): Promise<FindExchangeRatesResponse> {
		if (!userId || typeof userId !== "string") {
			throw new ValidationError("Invalid user ID", "userId");
		}

		const rawBaseCurrency = options?.baseCurrency;
		const baseCurrency =
			typeof rawBaseCurrency === "string" && rawBaseCurrency.length === 3
				? normalizeCurrencyCode(rawBaseCurrency)
				: undefined;

		const rawQuoteCurrency = options?.quoteCurrency;
		const quoteCurrency =
			typeof rawQuoteCurrency === "string" && rawQuoteCurrency.length === 3
				? normalizeCurrencyCode(rawQuoteCurrency)
				: undefined;

		const rawSource = options?.source;
		const source = typeof rawSource === "string" && rawSource.trim().length ? rawSource.trim() : undefined;

		const startRateAt = parseNumber(options?.startRateAt);
		const endRateAt = parseNumber(options?.endRateAt);

		const response = await this.exchangeRateRepository.findAll({
			baseCurrency,
			quoteCurrency,
			source,
			startRateAt,
			endRateAt,
		});

		return groupExchangeRates(response);
	}
}
