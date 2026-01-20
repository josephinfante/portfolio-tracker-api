export interface AccountEntity {
	id: string;
	userId: string;
	platformId: string;

	name: string;
	currencyCode?: string | null;

	createdAt: number; // unix timestamp
	updatedAt: number; // unix timestamp

	platform?: {
		id: string;
		name: string;
		type: string;
	};
}
