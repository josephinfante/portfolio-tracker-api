export type SnapshotListOrder = "ASC" | "DESC";

export interface SnapshotListFilters {
	limit?: number;
	offset?: number;
	page?: number;
	order?: SnapshotListOrder;
	startDate?: number; // unix timestamp
	endDate?: number; // unix timestamp
	[key: string]: any;
}
