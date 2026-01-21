import type { SortDirection } from "@shared/types/sort";

export interface CreateAccountInput {
	userId: string;
	platformId: string;
	name: string;
	currencyCode?: string | null;
}

export type UpdateAccountInput = Partial<Omit<CreateAccountInput, "userId">>;

export interface AccountListFilters {
	page?: number;
	pageSize?: number;
	search?: string;
	platform?: string;
	sortBy?: string;
	sortDirection?: SortDirection;
	[key: string]: any;
}
