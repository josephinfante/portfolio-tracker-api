import { TransactionRepository } from "@modules/transactions/domain/transaction.repository";
import { TOKENS } from "@shared/container/tokens";
import { ValidationError } from "@shared/errors/domain/validation.error";
import { inject, injectable } from "tsyringe";
import {
	TransactionCorrectionType,
	TransactionListFilters,
	TransactionType,
} from "@modules/transactions/domain/transaction.types";
import { PaginatedResponse } from "@shared/types/paginated-response";
import { TransactionEntity } from "@modules/transactions/domain/transaction.entity";
import { buildPaginatedResponse } from "@shared/helpers/pagination";

const transactionTypeValues = new Set(Object.values(TransactionType));
const correctionTypeValues = new Set(Object.values(TransactionCorrectionType));

const normalizeCurrencyCode = (code: string) => code.trim().toUpperCase();

const parseNumber = (value: unknown) => {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}
	if (typeof value === "string" && value.trim().length) {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : undefined;
	}
	return undefined;
};

@injectable()
export class ListTransactionsUseCase {
	constructor(@inject(TOKENS.TransactionRepository) private transactionRepository: TransactionRepository) {}

	async execute(userId: string, options?: TransactionListFilters): Promise<PaginatedResponse<TransactionEntity>> {
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

		const account = typeof options?.account === "string" && options.account.length ? options.account : undefined;
		const asset = typeof options?.asset === "string" && options.asset.length ? options.asset : undefined;

		const rawType = options?.transactionType;
		const transactionType =
			typeof rawType === "string" && transactionTypeValues.has(rawType)
				? (rawType as TransactionType)
				: undefined;

		const rawCorrection = options?.correctionType;
		const correctionType =
			typeof rawCorrection === "string" && correctionTypeValues.has(rawCorrection)
				? (rawCorrection as TransactionCorrectionType)
				: undefined;

		const referenceTxId =
			typeof options?.referenceTxId === "string" && options.referenceTxId.length
				? options.referenceTxId
				: undefined;

		const quantityMin = parseNumber(options?.quantityMin);
		const quantityMax = parseNumber(options?.quantityMax);
		const unitPriceMin = parseNumber(options?.unitPriceMin);
		const unitPriceMax = parseNumber(options?.unitPriceMax);
		const totalAmountMin = parseNumber(options?.totalAmountMin);
		const totalAmountMax = parseNumber(options?.totalAmountMax);
		const startDate = parseNumber(options?.startDate);
		const endDate = parseNumber(options?.endDate);

		const rawCurrencyCode = options?.currencyCode;
		const currencyCode =
			typeof rawCurrencyCode === "string" && rawCurrencyCode.length === 3
				? normalizeCurrencyCode(rawCurrencyCode)
				: undefined;

		const sqlOffset = limit > 0 ? (page - 1) * limit : 0;

		const { items, totalCount } = await this.transactionRepository.findByUserId(userId, {
			limit,
			offset: sqlOffset,
			account,
			asset,
			transactionType,
			correctionType,
			referenceTxId,
			quantityMin,
			quantityMax,
			unitPriceMin,
			unitPriceMax,
			totalAmountMin,
			totalAmountMax,
			currencyCode,
			startDate,
			endDate,
		});

		return buildPaginatedResponse({
			items,
			totalCount,
			limit,
			offset: page,
			meta: {
				limit,
				page,
				account,
				asset,
				transactionType,
				correctionType,
				referenceTxId,
				quantityMin,
				quantityMax,
				unitPriceMin,
				unitPriceMax,
				totalAmountMin,
				totalAmountMax,
				currencyCode,
				startDate,
				endDate,
			},
		});
	}
}
