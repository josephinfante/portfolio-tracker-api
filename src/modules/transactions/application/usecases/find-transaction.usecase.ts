import { TransactionRepository } from "@modules/transactions/domain/transaction.repository";
import { TOKENS } from "@shared/container/tokens";
import { ValidationError } from "@shared/errors/domain/validation.error";
import { inject, injectable } from "tsyringe";
import { NotFoundError } from "@shared/errors/domain/not-found.error";
import { AuthorizationError } from "@shared/errors/domain/authorization.error";

@injectable()
export class FindTransactionUseCase {
	constructor(@inject(TOKENS.TransactionRepository) private transactionRepository: TransactionRepository) {}

	async execute(id: string, userId: string) {
		if (!id || typeof id !== "string") {
			throw new ValidationError("Invalid transaction ID", "id");
		}

		if (!userId || typeof userId !== "string") {
			throw new ValidationError("Invalid user ID", "userId");
		}

		const transaction = await this.transactionRepository.findById(id);

		if (!transaction) {
			throw new NotFoundError(`Transaction ${id} not found`);
		}

		if (transaction.userId !== userId) {
			throw new AuthorizationError("Access denied");
		}

		return transaction;
	}
}
