import { AssetRepository } from "@modules/assets/domain/asset.repository";
import { TOKENS } from "@shared/container/tokens";
import { inject, injectable } from "tsyringe";
import { AssetListFilters, AssetType } from "@modules/assets/domain/asset.types";
import { PaginatedResponse } from "@shared/types/paginated-response";
import { AssetEntity } from "@modules/assets/domain/asset.entity";
import { buildPaginatedResponse } from "@shared/helpers/pagination";

const assetTypeValues = new Set(Object.values(AssetType));

@injectable()
export class ListAssetsUseCase {
	constructor(@inject(TOKENS.AssetRepository) private assetRepository: AssetRepository) {}

	async execute(options?: AssetListFilters): Promise<PaginatedResponse<AssetEntity>> {
		const rawLimit = options?.limit;
		const parsedLimit = typeof rawLimit === "string" ? Number(rawLimit) : rawLimit;
		const limit =
			parsedLimit !== undefined && Number.isFinite(parsedLimit) && parsedLimit >= 0 ? parsedLimit : 10;

		const rawPage = options?.page ?? options?.offset;
		const parsedPage = typeof rawPage === "string" ? Number(rawPage) : rawPage;
		const page = parsedPage !== undefined && Number.isFinite(parsedPage) && parsedPage >= 1 ? parsedPage : 1;

		const rawSearch = options?.search;
		const search = typeof rawSearch === "string" ? rawSearch : undefined;

		const rawType = options?.type;
		const type = typeof rawType === "string" && assetTypeValues.has(rawType) ? (rawType as AssetType) : undefined;

		const sqlOffset = limit > 0 ? (page - 1) * limit : 0;

		const { items, totalCount } = await this.assetRepository.findAll({
			limit,
			offset: sqlOffset,
			search,
			type,
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
				type,
			},
		});
	}
}
