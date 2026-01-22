export interface UserEntity {
	id: string;

	firstName: string;
	lastName: string;
	email: string;
	passwordHash: string;
	baseCurrency: string;
	timeZone: string;

	createdAt: number; // unix timestamp
	updatedAt: number; // unix timestamp
}
