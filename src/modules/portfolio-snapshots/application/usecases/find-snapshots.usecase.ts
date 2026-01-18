import { PortfolioSnapshotRepository } from "@modules/portfolio-snapshots/domain/portfolio-snapshot.repository";
import { SnapshotListFilters, SnapshotListOrder } from "@modules/portfolio-snapshots/domain/portfolio-snapshot.types";
import { TOKENS } from "@shared/container/tokens";
import { ValidationError } from "@shared/errors/domain/validation.error";
import { buildPaginatedResponse } from "@shared/helpers/pagination";
import { inject, injectable } from "tsyringe";

const normalizeOrder = (value?: string): SnapshotListOrder =>
	value && value.toUpperCase() === "ASC" ? "ASC" : "DESC";

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
export class FindSnapshotsUseCase {
	constructor(
		@inject(TOKENS.PortfolioSnapshotRepository) private portfolioSnapshotRepository: PortfolioSnapshotRepository,
	) {}

	async execute(userId: string, options?: SnapshotListFilters) {
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

		const order = normalizeOrder(typeof options?.order === "string" ? options.order : undefined);

		const startDate = parseNumber(options?.startDate);
		const endDate = parseNumber(options?.endDate);

		const sqlOffset = limit > 0 ? (page - 1) * limit : 0;

		const { items, totalCount } = await this.portfolioSnapshotRepository.findAllByUser(userId, {
			limit,
			offset: sqlOffset,
			order,
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
				order,
				startDate,
				endDate,
			},
		});
	}
}
