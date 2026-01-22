import { injectable } from "tsyringe";
import { CreateAssetUseCase } from "./usecases/create-asset.usecase";
import { UpdateAssetUseCase } from "./usecases/update-asset.usecase";
import { DeleteAssetUseCase } from "./usecases/delete-asset.usecase";
import { ListAssetsUseCase } from "./usecases/list-assets.usecase";
import { FindAssetUseCase } from "./usecases/find-asset.usecase";
import { GetAssetDetailsUseCase } from "./usecases/get-asset-details.usecase";
import { AssetEntity } from "../domain/asset.entity";
import { AssetListFilters } from "../domain/asset.types";
import { PaginatedResponse } from "@shared/types/paginated-response";
import { AssetDetailsResponse } from "./dtos/asset-details.response";

@injectable()
export class AssetService {
	constructor(
		private createAssetUseCase: CreateAssetUseCase,
		private updateAssetUseCase: UpdateAssetUseCase,
		private deleteAssetUseCase: DeleteAssetUseCase,
		private listAssetsUseCase: ListAssetsUseCase,
		private findAssetUseCase: FindAssetUseCase,
		private getAssetDetailsUseCase: GetAssetDetailsUseCase,
	) {}

	async createAsset(input: unknown): Promise<AssetEntity> {
		return await this.createAssetUseCase.execute(input);
	}

	async updateAsset(id: string, input: unknown): Promise<AssetEntity> {
		return await this.updateAssetUseCase.execute(id, input);
	}

	async deleteAsset(id: string): Promise<void> {
		await this.deleteAssetUseCase.execute(id);
	}

	async listAssets(options?: AssetListFilters): Promise<PaginatedResponse<AssetEntity>> {
		return await this.listAssetsUseCase.execute(options);
	}

	async findAsset(id: string): Promise<AssetEntity> {
		return await this.findAssetUseCase.execute(id);
	}

	async getAssetDetails(
		userId: string,
		id: string,
		options?: { quoteCurrency?: string; txLimit?: number },
	): Promise<AssetDetailsResponse> {
		return await this.getAssetDetailsUseCase.execute(userId, id, options);
	}
}
