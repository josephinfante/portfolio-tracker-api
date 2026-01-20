export interface CreateAccountInput {
	userId: string;
	platformId: string;
	name: string;
	currencyCode?: string | null;
}

export type UpdateAccountInput = Partial<Omit<CreateAccountInput, "userId">>;

export interface AccountListFilters {
	limit?: number;
	offset?: number;
	page?: number;
	search?: string;
	platform?: string;
	[key: string]: any;
}
