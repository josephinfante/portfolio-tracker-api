import { TransactionRepository } from "@modules/transactions/domain/transaction.repository";
import { TOKENS } from "@shared/container/tokens";
import { ValidationError } from "@shared/errors/domain/validation.error";
import { inject, injectable } from "tsyringe";
import { NotFoundError } from "@shared/errors/domain/not-found.error";
import { AuthorizationError } from "@shared/errors/domain/authorization.error";
import { buildTransactionDetails } from "@modules/transactions/domain/services/transaction-details-calculator";
import { UserRepository } from "@modules/users/domain/user.repository";
import { TransactionDetailsResponse } from "../dtos/transaction-details.response";
import { ExchangeRateRepository } from "@modules/exchange-rates/domain/exchange-rate.repository";

const normalizeCurrencyCode = (value: string | null | undefined): string => (value ?? "").trim().toUpperCase();

const normalizeTimestampToMs = (value: number): number => {
	if (!Number.isFinite(value)) {
		return Date.now();
	}
	return value < 1_000_000_000_000 ? value * 1000 : value;
};

@injectable()
export class GetTransactionDetailsUseCase {
	constructor(
		@inject(TOKENS.TransactionRepository) private transactionRepository: TransactionRepository,
		@inject(TOKENS.UserRepository) private userRepository: UserRepository,
		@inject(TOKENS.ExchangeRateRepository) private exchangeRateRepository: ExchangeRateRepository,
	) {}

	private async resolveExchangeRate(
		baseCurrency: string,
		paymentSymbol: string | null,
		transactionDate: number,
	): Promise<number | null> {
		if (!paymentSymbol || baseCurrency.length !== 3) {
			return null;
		}

		const normalizedPayment = normalizeCurrencyCode(paymentSymbol);
		const normalizedBase = normalizeCurrencyCode(baseCurrency);

		if (!normalizedPayment || normalizedPayment.length !== 3) {
			return null;
		}

		if (normalizedPayment === normalizedBase) {
			return 1;
		}

		const endRateAt = normalizeTimestampToMs(transactionDate);
		const response = await this.exchangeRateRepository.findAll({
			baseCurrency: normalizedPayment,
			quoteCurrency: normalizedBase,
			endRateAt,
		});

		let latestRate: { buyRate: number; sellRate: number; rateAt: number } | null = null;
		for (const item of response.items) {
			for (const rate of item.rates) {
				if (!latestRate || rate.rateAt > latestRate.rateAt) {
					latestRate = { buyRate: rate.buyRate, sellRate: rate.sellRate, rateAt: rate.rateAt };
				}
			}
		}

		if (!latestRate) {
			return null;
		}

		return (latestRate.buyRate + latestRate.sellRate) / 2;
	}

	async execute(id: string, userId: string): Promise<TransactionDetailsResponse> {
		if (!id || typeof id !== "string") {
			throw new ValidationError("Invalid transaction ID", "id");
		}

		if (!userId || typeof userId !== "string") {
			throw new ValidationError("Invalid user ID", "userId");
		}

		const record = await this.transactionRepository.findDetailsById(id);

		if (!record) {
			throw new NotFoundError(`Transaction ${id} not found`);
		}

		if (record.transaction.userId !== userId) {
			throw new AuthorizationError("Access denied");
		}

		const user = await this.userRepository.findById(userId);
		if (!user) {
			throw new NotFoundError(`User ${userId} not found`);
		}

		const baseCurrency = normalizeCurrencyCode(user.baseCurrency);
		const related = await this.transactionRepository.findByUserId(userId, { referenceTxId: id });
		const hasReverse = related.items.some((item) => item.correctionType === "reverse");
		const exchangeRate = await this.resolveExchangeRate(
			baseCurrency,
			record.paymentAsset?.symbol ?? null,
			record.transaction.transactionDate,
		);

		return buildTransactionDetails({
			...record,
			baseCurrency,
			exchangeRate,
			hasReverse,
		});
	}
}
