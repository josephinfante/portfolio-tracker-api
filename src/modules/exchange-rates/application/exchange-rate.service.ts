import { injectable } from "tsyringe";
import {
	CreateExchangeRateInput,
	FindExchangeRatesOptions,
	FindExchangeRatesResponse,
	FxRate,
} from "../domain/exchange-rate.types";
import { FindExchangeRatesUseCase } from "./usecases/find-exchange-rates.usecase";
import { UpsertExchangeRateUseCase } from "./usecases/upsert-exchange-rate.usecase";
import { GetFxUsdToBaseUseCase } from "./usecases/get-fx-usd-to-base.usecase";

@injectable()
export class ExchangeRateService {
	constructor(
		private upsertExchangeRateUseCase: UpsertExchangeRateUseCase,
		private findExchangeRatesUseCase: FindExchangeRatesUseCase,
		private getFxUsdToBaseUseCase: GetFxUsdToBaseUseCase,
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

	async getFxUsdToBase(userId: string): Promise<FxRate> {
		return await this.getFxUsdToBaseUseCase.execute(userId);
	}
}
