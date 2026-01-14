export interface PaginatedResponse<T> {
	items: T[];
	totalCount: number;
	pageSize: number;
	totalPages: number;
	hasNextPage: boolean;
	hasPreviousPage: boolean;
	meta?: Record<string, any>;
}
