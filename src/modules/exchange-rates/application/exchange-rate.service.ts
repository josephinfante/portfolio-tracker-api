import { injectable } from "tsyringe";
import {
	CreateExchangeRateInput,
	FindExchangeRatesOptions,
	FindExchangeRatesResponse,
} from "../domain/exchange-rate.types";
import { FindExchangeRatesUseCase } from "./usecases/find-exchange-rates.usecase";
import { UpsertExchangeRateUseCase } from "./usecases/upsert-exchange-rate.usecase";

@injectable()
export class ExchangeRateService {
	constructor(
		private upsertExchangeRateUseCase: UpsertExchangeRateUseCase,
		private findExchangeRatesUseCase: FindExchangeRatesUseCase,
	) {}

	async upsertExchangeRate(input: CreateExchangeRateInput): Promise<void> {
		await this.upsertExchangeRateUseCase.execute(input);
	}

	async findExchangeRates(
		userId: string,
		options?: FindExchangeRatesOptions,
	): Promise<FindExchangeRatesResponse> {
		return await this.findExchangeRatesUseCase.execute(userId, options);
	}
}
