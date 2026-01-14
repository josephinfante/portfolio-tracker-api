export interface CreateAccountInput {
	userId: string;
	platformId: string;
	name: string;
	currencyCode: string;
}

export type UpdateAccountInput = Partial<Omit<CreateAccountInput, "userId">>;

export interface AccountListFilters {
	limit?: number;
	offset?: number;
	page?: number;
	search?: string;
	platform?: string;
	currencyCode?: string;
	[key: string]: any;
}
