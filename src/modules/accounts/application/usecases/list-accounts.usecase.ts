import { AccountRepository } from "@modules/accounts/domain/account.repository";
import { TOKENS } from "@shared/container/tokens";
import { ValidationError } from "@shared/errors/domain/validation.error";
import { inject, injectable } from "tsyringe";
import { AccountListFilters } from "@modules/accounts/domain/account.types";
import { PaginatedResponse } from "@shared/types/paginated-response";
import { AccountEntity } from "@modules/accounts/domain/account.entity";
import { buildPaginatedResponse } from "@shared/helpers/pagination";

@injectable()
export class ListAccountsUseCase {
	constructor(@inject(TOKENS.AccountRepository) private accountRepository: AccountRepository) {}

	async execute(userId: string, options?: AccountListFilters): Promise<PaginatedResponse<AccountEntity>> {
		if (!userId || typeof userId !== "string") {
			throw new ValidationError("Invalid user ID", "userId");
		}

		const rawLimit = options?.limit;
		const parsedLimit = typeof rawLimit === "string" ? Number(rawLimit) : rawLimit;
		const limit =
			parsedLimit !== undefined && Number.isFinite(parsedLimit) && parsedLimit >= 0 ? parsedLimit : 10;

		const rawPage = options?.page ?? options?.offset;
		const parsedPage = typeof rawPage === "string" ? Number(rawPage) : rawPage;
		const page = parsedPage !== undefined && Number.isFinite(parsedPage) && parsedPage >= 1 ? parsedPage : 1;

		const rawSearch = options?.search;
		const search = typeof rawSearch === "string" ? rawSearch : undefined;

		const rawPlatform = options?.platform;
		const platform = typeof rawPlatform === "string" && rawPlatform.length ? rawPlatform : undefined;

		const rawCurrencyCode = options?.currencyCode;
		const currencyCode = typeof rawCurrencyCode === "string" && rawCurrencyCode.length === 3 ? rawCurrencyCode : undefined;

		const sqlOffset = limit > 0 ? (page - 1) * limit : 0;

		const { items, totalCount } = await this.accountRepository.findByUserId(userId, {
			limit,
			offset: sqlOffset,
			search,
			platform,
			currencyCode,
		});

		return buildPaginatedResponse({
			items,
			totalCount,
			limit,
			offset: page,
			meta: {
				limit,
				page,
				search,
				platform,
				currencyCode,
			},
		});
	}
}
