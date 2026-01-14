import { AccountRepository } from "@modules/accounts/domain/account.repository";
import { TOKENS } from "@shared/container/tokens";
import { inject, injectable } from "tsyringe";
import { CreateAccountSchema } from "../validators/create-account.validator";
import { ValidationError } from "@shared/errors/domain/validation.error";
import { zodErrorMapper } from "@shared/helpers/zod-error-mapper";
import { currenciesDataset } from "@shared/dataset/currencies.dataset";

const validCurrencyCodes = new Set(currenciesDataset.map((currency) => currency.code));

const normalizeCurrencyCode = (code: string) => code.trim().toUpperCase();

@injectable()
export class CreateAccountUseCase {
	constructor(@inject(TOKENS.AccountRepository) private accountRepository: AccountRepository) {}

	async execute(userId: string, input: unknown) {
		if (!userId || typeof userId !== "string") {
			throw new ValidationError("Invalid user ID", "userId");
		}

		const result = CreateAccountSchema.safeParse(input);
		if (!result.success) {
			throw new ValidationError("Invalid account data", undefined, undefined, {
				context: { errors: zodErrorMapper(result.error) },
			});
		}

		const data = result.data;
		const currencyCode = normalizeCurrencyCode(data.currencyCode);

		if (!validCurrencyCodes.has(currencyCode)) {
			throw new ValidationError("Invalid currency code", "currencyCode");
		}

		return await this.accountRepository.create({
			userId,
			platformId: data.platformId,
			name: data.name,
			currencyCode,
		});
	}
}
