import { ExchangeRateRepository } from "@modules/exchange-rates/domain/exchange-rate.repository";
import { CreateExchangeRateInput } from "@modules/exchange-rates/domain/exchange-rate.types";
import { TOKENS } from "@shared/container/tokens";
import { ValidationError } from "@shared/errors/domain/validation.error";
import { inject, injectable } from "tsyringe";

const normalizeCurrencyCode = (value: string) => value.trim().toUpperCase();

@injectable()
export class UpsertExchangeRateUseCase {
	constructor(@inject(TOKENS.ExchangeRateRepository) private exchangeRateRepository: ExchangeRateRepository) {}

	async execute(input: CreateExchangeRateInput): Promise<void> {
		if (!input) {
			throw new ValidationError("Missing exchange rate payload", "exchangeRate");
		}

		if (!input.baseCurrency || typeof input.baseCurrency !== "string" || input.baseCurrency.length !== 3) {
			throw new ValidationError("Invalid base currency", "baseCurrency");
		}

		if (!input.quoteCurrency || typeof input.quoteCurrency !== "string" || input.quoteCurrency.length !== 3) {
			throw new ValidationError("Invalid quote currency", "quoteCurrency");
		}

		if (typeof input.buyRate !== "number" || !Number.isFinite(input.buyRate)) {
			throw new ValidationError("Invalid buy rate", "buyRate");
		}

		if (typeof input.sellRate !== "number" || !Number.isFinite(input.sellRate)) {
			throw new ValidationError("Invalid sell rate", "sellRate");
		}

		if (!input.source || typeof input.source !== "string" || !input.source.trim()) {
			throw new ValidationError("Invalid source", "source");
		}

		if (typeof input.rateAt !== "number" || !Number.isFinite(input.rateAt)) {
			throw new ValidationError("Invalid rateAt", "rateAt");
		}

		await this.exchangeRateRepository.upsert({
			baseCurrency: normalizeCurrencyCode(input.baseCurrency),
			quoteCurrency: normalizeCurrencyCode(input.quoteCurrency),
			buyRate: input.buyRate,
			sellRate: input.sellRate,
			source: input.source.trim(),
			rateAt: input.rateAt,
		});
	}
}
