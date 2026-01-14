import { AccountRepository } from "@modules/accounts/domain/account.repository";
import { TOKENS } from "@shared/container/tokens";
import { ValidationError } from "@shared/errors/domain/validation.error";
import { inject, injectable } from "tsyringe";
import { NotFoundError } from "@shared/errors/domain/not-found.error";
import { AuthorizationError } from "@shared/errors/domain/authorization.error";

@injectable()
export class FindAccountUseCase {
	constructor(@inject(TOKENS.AccountRepository) private accountRepository: AccountRepository) {}

	async execute(id: string, userId: string) {
		if (!id || typeof id !== "string") {
			throw new ValidationError("Invalid account ID", "id");
		}

		if (!userId || typeof userId !== "string") {
			throw new ValidationError("Invalid user ID", "userId");
		}

		const account = await this.accountRepository.findById(id);

		if (!account) {
			throw new NotFoundError(`Account ${id} not found`);
		}

		if (account.userId !== userId) {
			throw new AuthorizationError("Access denied");
		}

		return account;
	}
}
