import { TransactionRepository } from "@modules/transactions/domain/transaction.repository";
import { TOKENS } from "@shared/container/tokens";
import { ValidationError } from "@shared/errors/domain/validation.error";
import { inject, injectable } from "tsyringe";
import { NotFoundError } from "@shared/errors/domain/not-found.error";
import { AuthorizationError } from "@shared/errors/domain/authorization.error";
import { ReverseTransactionSchema } from "../validators/reverse-transaction.validator";
import { zodErrorMapper } from "@shared/helpers/zod-error-mapper";

@injectable()
export class ReverseTransactionUseCase {
	constructor(@inject(TOKENS.TransactionRepository) private transactionRepository: TransactionRepository) {}

	async execute(id: string, userId: string, input: unknown) {
		if (!id || typeof id !== "string") {
			throw new ValidationError("Invalid transaction ID", "id");
		}

		if (!userId || typeof userId !== "string") {
			throw new ValidationError("Invalid user ID", "userId");
		}

		const result = ReverseTransactionSchema.safeParse(input);
		if (!result.success) {
			throw new ValidationError("Invalid reverse data", undefined, undefined, {
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

		return this.transactionRepository.reverse(id, result.data.reason ?? null);
	}
}
