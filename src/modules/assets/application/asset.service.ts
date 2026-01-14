import { injectable } from "tsyringe";
import { CreateAssetUseCase } from "./usecases/create-asset.usecase";
import { UpdateAssetUseCase } from "./usecases/update-asset.usecase";
import { DeleteAssetUseCase } from "./usecases/delete-asset.usecase";
import { ListAssetsUseCase } from "./usecases/list-assets.usecase";
import { FindAssetUseCase } from "./usecases/find-asset.usecase";
import { AssetEntity } from "../domain/asset.entity";
import { AssetListFilters } from "../domain/asset.types";
import { PaginatedResponse } from "@shared/types/paginated-response";

@injectable()
export class AssetService {
	constructor(
		private createAssetUseCase: CreateAssetUseCase,
		private updateAssetUseCase: UpdateAssetUseCase,
		private deleteAssetUseCase: DeleteAssetUseCase,
		private listAssetsUseCase: ListAssetsUseCase,
		private findAssetUseCase: FindAssetUseCase,
	) {}

	async createAsset(userId: string, input: unknown): Promise<AssetEntity> {
		return await this.createAssetUseCase.execute(userId, input);
	}

	async updateAsset(id: string, userId: string, input: unknown): Promise<AssetEntity> {
		return await this.updateAssetUseCase.execute(id, userId, input);
	}

	async deleteAsset(id: string, userId: string): Promise<void> {
		await this.deleteAssetUseCase.execute(id, userId);
	}

	async listAssets(userId: string, options?: AssetListFilters): Promise<PaginatedResponse<AssetEntity>> {
		return await this.listAssetsUseCase.execute(userId, options);
	}

	async findAsset(id: string, userId: string): Promise<AssetEntity> {
		return await this.findAssetUseCase.execute(id, userId);
	}
}
