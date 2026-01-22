import { AccountRepository } from "@modules/accounts/domain/account.repository";
import { PlatformRepository } from "@modules/platforms/domain/platform.repository";
import { TOKENS } from "@shared/container/tokens";
import { inject, injectable } from "tsyringe";
import { UpdateAccountSchema } from "../validators/update-account.validator";
import { ValidationError } from "@shared/errors/domain/validation.error";
import { zodErrorMapper } from "@shared/helpers/zod-error-mapper";
import { NotFoundError } from "@shared/errors/domain/not-found.error";
import { applyPatch } from "@shared/helpers/apply-patch";
import { AuthorizationError } from "@shared/errors/domain/authorization.error";
import { currenciesDataset } from "@shared/dataset/currencies.dataset";
import { PlatformTypes } from "@modules/platforms/domain/platform.types";

const validCurrencyCodes = new Set(currenciesDataset.map((currency) => currency.code));

const normalizeCurrencyCode = (code: string) => code.trim().toUpperCase();

@injectable()
export class UpdateAccountUseCase {
	constructor(
		@inject(TOKENS.AccountRepository) private accountRepository: AccountRepository,
		@inject(TOKENS.PlatformRepository) private platformRepository: PlatformRepository,
	) {}

	async execute(id: string, userId: string, input: unknown) {
		if (!id || typeof id !== "string") {
			throw new ValidationError("Invalid account ID", "id");
		}

		if (!userId || typeof userId !== "string") {
			throw new ValidationError("Invalid user ID", "userId");
		}

		const result = UpdateAccountSchema.safeParse(input);
		if (!result.success) {
			throw new ValidationError("Invalid account data", undefined, undefined, {
				context: { errors: zodErrorMapper(result.error) },
			});
		}

		const data = result.data;

		const account = await this.accountRepository.findById(id);
		if (!account) {
			throw new NotFoundError(`Account ${id} not found`);
		}

		let platformType = account.platform?.type;
		if (data.platformId) {
			const platform = await this.platformRepository.findById(data.platformId);
			if (!platform) {
				throw new NotFoundError(`Platform ${data.platformId} not found`);
			}
			if (platform.userId !== userId) {
				throw new AuthorizationError("Access denied");
			}
			platformType = platform.type;
		}

		if (data.currencyCode !== undefined) {
			if (data.currencyCode === null) {
				if (platformType === PlatformTypes.bank) {
					throw new ValidationError("Currency code is required for bank accounts", "currencyCode");
				}
			} else {
				const currencyCode = normalizeCurrencyCode(data.currencyCode);
				if (!validCurrencyCodes.has(currencyCode)) {
					throw new ValidationError("Invalid currency code", "currencyCode");
				}
				data.currencyCode = currencyCode;
			}
		}

		const resolvedCurrencyCode = data.currencyCode ?? account.currencyCode ?? null;
		if (platformType === PlatformTypes.bank && !resolvedCurrencyCode) {
			throw new ValidationError("Currency code is required for bank accounts", "currencyCode");
		}

		const patch = applyPatch(account, data, ["platformId", "name", "currencyCode"]);

		if (Object.keys(patch).length === 0) {
			return account;
		}

		return this.accountRepository.update(id, patch);
	}
}
