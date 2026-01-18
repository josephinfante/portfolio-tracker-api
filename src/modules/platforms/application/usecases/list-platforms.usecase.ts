import { PlatformRepository } from "@modules/platforms/domain/platform.repository";
import { TOKENS } from "@shared/container/tokens";
import { ValidationError } from "@shared/errors/domain/validation.error";
import { inject, injectable } from "tsyringe";
import { FindByUserIdFilters, PlatformTypes } from "@modules/platforms/domain/platform.types";
import { PaginatedResponse } from "@shared/types/paginated-response";
import { PlatformEntity } from "@modules/platforms/domain/platform.entity";
import { buildPaginatedResponse } from "@shared/helpers/pagination";

@injectable()
export class ListPlatformsUseCase {
	constructor(@inject(TOKENS.PlatformRepository) private platformRepository: PlatformRepository) {}

	async execute(userId: string, options?: FindByUserIdFilters): Promise<PaginatedResponse<PlatformEntity>> {
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

		const rawType = options?.type;
		const type =
			typeof rawType === "string" && Object.values(PlatformTypes).includes(rawType as PlatformTypes)
				? (rawType as PlatformTypes)
				: undefined;

		const sqlOffset = limit > 0 ? (page - 1) * limit : 0;

		const { items, totalCount } = await this.platformRepository.findByUserId(userId, {
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
