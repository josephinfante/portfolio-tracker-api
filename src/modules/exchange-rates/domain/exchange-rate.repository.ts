import { CreateExchangeRateInput, FindExchangeRatesOptions, FindExchangeRatesResponse } from "./exchange-rate.types";

export interface ExchangeRateRepository {
	upsert(exchangeRate: CreateExchangeRateInput): Promise<void>;
	findAll(options: FindExchangeRatesOptions): Promise<FindExchangeRatesResponse>;
}
