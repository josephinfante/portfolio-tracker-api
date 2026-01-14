export enum PlatformTypes {
	exchange = "exchange",
	bank = "bank",
	broker = "broker",
	wallet = "wallet",
	yield_platform = "yield_platform",
	payment_processor = "payment_processor",
	custodian = "custodian",
	fund = "fund",
	other = "other",
}

export interface CreatePlatformInput {
	userId: string;
	name: string;
	type: PlatformTypes;
	country: string;
}

export interface UpdatePlatformInput {
	name?: string;
	type?: PlatformTypes;
	country?: string;
}

export interface FindByUserIdFilters {
	limit?: number;
	offset?: number;
	page?: number;
	search?: string;
	type?: PlatformTypes;
	[key: string]: any;
}
