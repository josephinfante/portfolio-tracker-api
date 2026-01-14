import { PlatformTypes } from "./platform.types";

export interface PlatformEntity {
	id: string;
	userId: string;

	name: string;
	type: PlatformTypes;
	country: string;

	createdAt: number; // unix timestamp
	updatedAt: number; // unix timestamp
}
