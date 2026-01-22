import type { SortDirection } from "@shared/types/sort";

export type SnapshotListOrder = "ASC" | "DESC";

export interface SnapshotListFilters {
	page?: number;
	pageSize?: number;
	order?: SnapshotListOrder;
	startDate?: number; // unix timestamp
	endDate?: number; // unix timestamp
	sortBy?: string;
	sortDirection?: SortDirection;
	[key: string]: any;
}
