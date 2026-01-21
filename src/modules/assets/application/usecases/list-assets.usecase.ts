import { AssetRepository } from "@modules/assets/domain/asset.repository";
import { TOKENS } from "@shared/container/tokens";
import { inject, injectable } from "tsyringe";
import { AssetListFilters, AssetType } from "@modules/assets/domain/asset.types";
import { PaginatedResponse } from "@shared/types/paginated-response";
import { AssetEntity } from "@modules/assets/domain/asset.entity";
import { buildPaginatedResponse } from "@shared/helpers/pagination";
import type { SortDirection } from "@shared/types/sort";

const assetTypeValues = new Set(Object.values(AssetType));
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
export class ListAssetsUseCase {
	constructor(@inject(TOKENS.AssetRepository) private assetRepository: AssetRepository) {}

	async execute(options?: AssetListFilters): Promise<PaginatedResponse<AssetEntity>> {
		const rawLimit = options?.pageSize;
		const parsedLimit = typeof rawLimit === "string" ? Number(rawLimit) : rawLimit;
		const limit = parsedLimit !== undefined && Number.isFinite(parsedLimit) && parsedLimit >= 0 ? parsedLimit : 10;

		const rawPage = options?.page;
		const parsedPage = typeof rawPage === "string" ? Number(rawPage) : rawPage;
		const page = parsedPage !== undefined && Number.isFinite(parsedPage) && parsedPage >= 1 ? parsedPage : 1;

		const rawSearch = options?.search;
		const search = typeof rawSearch === "string" ? rawSearch : undefined;

		const rawType = options?.type;
		const type = typeof rawType === "string" && assetTypeValues.has(rawType) ? (rawType as AssetType) : undefined;

		const sortBy = normalizeSortBy(options?.sortBy);
		const sortDirection = normalizeSortDirection(options?.sortDirection);

		const sqlOffset = limit > 0 ? (page - 1) * limit : 0;

		const { items, totalCount } = await this.assetRepository.findAll({
			pageSize: limit,
			page: sqlOffset,
			search,
			type,
			sortBy,
			sortDirection,
		});

		return buildPaginatedResponse({
			items,
			totalCount,
			limit,
			offset: page,
			meta: {
				pageSize: limit,
				page,
				search,
				type,
				sortBy,
				sortDirection,
			},
		});
	}
}
