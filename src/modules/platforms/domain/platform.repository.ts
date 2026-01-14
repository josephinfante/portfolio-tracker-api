import { PlatformEntity } from "./platform.entity";
import { CreatePlatformInput, FindByUserIdFilters, UpdatePlatformInput } from "./platform.types";

export interface PlatformRepository {
	findById(id: string): Promise<PlatformEntity | null>;
	findByUserId(
		userId: string,
		options?: FindByUserIdFilters,
	): Promise<{ items: PlatformEntity[]; totalCount: number }>;

	create(data: CreatePlatformInput): Promise<PlatformEntity>;
	update(id: string, data: UpdatePlatformInput): Promise<PlatformEntity>;
	delete(id: string): Promise<void>;
}
