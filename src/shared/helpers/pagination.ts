import { PaginatedResponse } from "@shared/types/paginated-response";

interface BuildPaginationInput<T> {
	items: T[];
	totalCount: number;
	limit: number;
	offset: number;
	meta?: Record<string, any>;
}

export function buildPaginatedResponse<T>({
	items,
	totalCount,
	limit,
	offset,
	meta,
}: BuildPaginationInput<T>): PaginatedResponse<T> {
	const pageSize = limit === 0 ? totalCount : limit;
	const totalPages = pageSize > 0 ? Math.ceil(totalCount / pageSize) : 0;
	const hasNextPage = limit === 0 ? false : offset < totalPages;
	const hasPreviousPage = limit === 0 ? false : offset > 1;

	return {
		items,
		totalCount,
		pageSize,
		totalPages,
		hasNextPage,
		hasPreviousPage,
		meta,
	};
}
