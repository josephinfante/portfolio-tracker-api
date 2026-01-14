import { AssetEntity } from "./asset.entity";
import { AssetListFilters, CreateAssetInput, UpdateAssetInput } from "./asset.types";

export interface AssetRepository {
	findById(id: string): Promise<AssetEntity | null>;
	findByUserId(userId: string, options?: AssetListFilters): Promise<{ items: AssetEntity[]; totalCount: number }>;

	create(data: CreateAssetInput): Promise<AssetEntity>;
	update(id: string, data: UpdateAssetInput): Promise<AssetEntity>;
	delete(id: string): Promise<void>;
}
