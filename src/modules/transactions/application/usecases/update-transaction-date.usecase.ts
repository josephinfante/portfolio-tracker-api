import { TransactionRepository } from "@modules/transactions/domain/transaction.repository";
import { TOKENS } from "@shared/container/tokens";
import { inject, injectable } from "tsyringe";
import { UpdateTransactionDateSchema } from "../validators/update-transaction-date.validator";
import { ValidationError } from "@shared/errors/domain/validation.error";
import { zodErrorMapper } from "@shared/helpers/zod-error-mapper";
import { NotFoundError } from "@shared/errors/domain/not-found.error";
import { AuthorizationError } from "@shared/errors/domain/authorization.error";
import { TransactionType } from "@modules/transactions/domain/transaction.types";

@injectable()
export class UpdateTransactionDateUseCase {
	constructor(@inject(TOKENS.TransactionRepository) private transactionRepository: TransactionRepository) {}

	async execute(id: string, userId: string, input: unknown) {
		if (!id || typeof id !== "string") {
			throw new ValidationError("Invalid transaction ID", "id");
		}

		if (!userId || typeof userId !== "string") {
			throw new ValidationError("Invalid user ID", "userId");
		}

		const result = UpdateTransactionDateSchema.safeParse(input);
		if (!result.success) {
			throw new ValidationError("Invalid transaction data", undefined, undefined, {
				context: { errors: zodErrorMapper(result.error) },
			});
		}

		const transaction = await this.transactionRepository.findById(id);
		if (!transaction) {
			throw new NotFoundError(`Transaction ${id} not found`);
		}

		if (transaction.userId !== userId) {
			throw new AuthorizationError("Access denied");
		}

		const { transactionDate } = result.data;
		if (transaction.transactionDate === transactionDate) {
			return transaction;
		}

		const updated = await this.transactionRepository.runInTransaction(async (tx) => {
			const base = await this.transactionRepository.updateTransactionDate(id, transactionDate, tx);
			if (base.transactionType !== TransactionType.FEE) {
				await this.transactionRepository.updateFeeTransactionDatesByReference(id, transactionDate, tx);
			}
			return base;
		});

		return updated;
	}
}
