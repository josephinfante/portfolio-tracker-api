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
import type { SortDirection } from "@shared/types/sort";

const transactionTypeValues = new Set(Object.values(TransactionType));
const correctionTypeValues = new Set(Object.values(TransactionCorrectionType));

const buildActions = (correctionType: TransactionCorrectionType | null, hasReverse: boolean) => {
	const isOriginal = correctionType === null;
	const isReverse = correctionType === TransactionCorrectionType.REVERSE;
	const status = "settled";
	return {
		canReverse: isOriginal && !hasReverse && status === "settled",
		canAdjust: !isReverse && !hasReverse && status === "settled",
	};
};

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

const normalizeSortDirection = (value: unknown): SortDirection | undefined => {
	if (typeof value !== "string") {
		return undefined;
	}

	const normalized = value.toLowerCase();
	return normalized === "asc" || normalized === "desc" ? (normalized as SortDirection) : undefined;
};

const normalizeSortBy = (value: unknown): string | undefined => {
	if (typeof value !== "string") {
		return undefined;
	}

	const trimmed = value.trim();
	return trimmed.length ? trimmed : undefined;
};

@injectable()
export class ListTransactionsUseCase {
	constructor(@inject(TOKENS.TransactionRepository) private transactionRepository: TransactionRepository) {}

	async execute(userId: string, options?: TransactionListFilters): Promise<PaginatedResponse<TransactionEntity>> {
		if (!userId || typeof userId !== "string") {
			throw new ValidationError("Invalid user ID", "userId");
		}

		const rawLimit = options?.pageSize;
		const parsedLimit = typeof rawLimit === "string" ? Number(rawLimit) : rawLimit;
		const limit = parsedLimit !== undefined && Number.isFinite(parsedLimit) && parsedLimit >= 0 ? parsedLimit : 10;

		const rawPage = options?.page;
		const parsedPage = typeof rawPage === "string" ? Number(rawPage) : rawPage;
		const page = parsedPage !== undefined && Number.isFinite(parsedPage) && parsedPage >= 1 ? parsedPage : 1;

		const account = typeof options?.account === "string" && options.account.length ? options.account : undefined;
		const asset = typeof options?.asset === "string" && options.asset.length ? options.asset : undefined;

		const rawType = options?.transactionType;
		const transactionType =
			typeof rawType === "string" && transactionTypeValues.has(rawType) ? (rawType as TransactionType) : undefined;

		const rawCorrection = options?.correctionType;
		const correctionType =
			typeof rawCorrection === "string" && correctionTypeValues.has(rawCorrection)
				? (rawCorrection as TransactionCorrectionType)
				: undefined;

		const referenceTxId =
			typeof options?.referenceTxId === "string" && options.referenceTxId.length ? options.referenceTxId : undefined;

		const quantityMin = parseNumber(options?.quantityMin);
		const quantityMax = parseNumber(options?.quantityMax);
		const totalAmountMin = parseNumber(options?.totalAmountMin);
		const totalAmountMax = parseNumber(options?.totalAmountMax);
		const startDate = parseNumber(options?.startDate);
		const endDate = parseNumber(options?.endDate);

		const paymentAsset =
			typeof options?.paymentAsset === "string" && options.paymentAsset.length ? options.paymentAsset : undefined;
		const paymentQuantityMin = parseNumber(options?.paymentQuantityMin);
		const paymentQuantityMax = parseNumber(options?.paymentQuantityMax);

		const sortBy = normalizeSortBy(options?.sortBy);
		const sortDirection = normalizeSortDirection(options?.sortDirection);

		const sqlOffset = limit > 0 ? (page - 1) * limit : 0;

		const { items, totalCount } = await this.transactionRepository.findByUserId(userId, {
			pageSize: limit,
			page: sqlOffset,
			account,
			asset,
			transactionType,
			correctionType,
			referenceTxId,
			quantityMin,
			quantityMax,
			totalAmountMin,
			totalAmountMax,
			paymentAsset,
			paymentQuantityMin,
			paymentQuantityMax,
			startDate,
			endDate,
			sortBy,
			sortDirection,
		});

		const reversedOriginalIds = new Set(
			items
				.filter((item) => item.correctionType === TransactionCorrectionType.REVERSE && item.referenceTxId)
				.map((item) => item.referenceTxId as string),
		);

		const enrichedItems = items.map((item) => ({
			...item,
			actions: buildActions(item.correctionType, reversedOriginalIds.has(item.id)),
		}));

		return buildPaginatedResponse({
			items: enrichedItems,
			totalCount,
			limit,
			offset: page,
			meta: {
				pageSize: limit,
				page,
				account,
				asset,
				transactionType,
				correctionType,
				referenceTxId,
				quantityMin,
				quantityMax,
				totalAmountMin,
				totalAmountMax,
				paymentAsset,
				paymentQuantityMin,
				paymentQuantityMax,
				startDate,
				endDate,
				sortBy,
				sortDirection,
			},
		});
	}
}
