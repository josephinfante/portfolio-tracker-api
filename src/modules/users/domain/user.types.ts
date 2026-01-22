export interface CreateUserInput {
	firstName: string;
	lastName: string;
	email: string;
	password: string;
	baseCurrency?: string;
	timeZone?: string;
}

export interface UserName {
	firstName: string;
	lastName: string;
}

export type UpdateUserInput = Partial<Omit<CreateUserInput, "email">> & {
	oldPassword?: string;
	newPassword?: string;
};
