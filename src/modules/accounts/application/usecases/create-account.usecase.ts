import { AccountRepository } from "@modules/accounts/domain/account.repository";
import { PlatformRepository } from "@modules/platforms/domain/platform.repository";
import { PlatformTypes } from "@modules/platforms/domain/platform.types";
import { TOKENS } from "@shared/container/tokens";
import { inject, injectable } from "tsyringe";
import { CreateAccountSchema } from "../validators/create-account.validator";
import { ValidationError } from "@shared/errors/domain/validation.error";
import { zodErrorMapper } from "@shared/helpers/zod-error-mapper";
import { currenciesDataset } from "@shared/dataset/currencies.dataset";
import { NotFoundError } from "@shared/errors/domain/not-found.error";
import { AuthorizationError } from "@shared/errors/domain/authorization.error";

const validCurrencyCodes = new Set(currenciesDataset.map((currency) => currency.code));

const normalizeCurrencyCode = (code: string) => code.trim().toUpperCase();

@injectable()
export class CreateAccountUseCase {
	constructor(
		@inject(TOKENS.AccountRepository) private accountRepository: AccountRepository,
		@inject(TOKENS.PlatformRepository) private platformRepository: PlatformRepository,
	) {}

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
		const platform = await this.platformRepository.findById(data.platformId);
		if (!platform) {
			throw new NotFoundError(`Platform ${data.platformId} not found`);
		}
		if (platform.userId !== userId) {
			throw new AuthorizationError("Access denied");
		}

		const rawCurrencyCode = data.currencyCode ?? null;
		const currencyCode = rawCurrencyCode ? normalizeCurrencyCode(rawCurrencyCode) : null;

		if (platform.type === PlatformTypes.bank && !currencyCode) {
			throw new ValidationError("Currency code is required for bank accounts", "currencyCode");
		}

		if (currencyCode && !validCurrencyCodes.has(currencyCode)) {
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
