import { AssetEntity } from "./asset.entity";
import { AssetListFilters, CreateAssetInput, UpdateAssetInput } from "./asset.types";

export interface AssetRepository {
	findById(id: string): Promise<AssetEntity | null>;
	findAll(options?: AssetListFilters): Promise<{ items: AssetEntity[]; totalCount: number }>;
	findByIdentifiers(identifiers: string[]): Promise<AssetEntity[]>;

	create(data: CreateAssetInput): Promise<AssetEntity>;
	update(id: string, data: UpdateAssetInput): Promise<AssetEntity>;
	delete(id: string): Promise<void>;
}
