export interface AccountEntity {
	id: string;
	userId: string;
	platformId: string;

	name: string;
	currencyCode: string;

	createdAt: number; // unix timestamp
	updatedAt: number; // unix timestamp

	platform?: {
		id: string;
		name: string;
		type: string;
	};
}
