import { injectable } from "tsyringe";
import {
	CreateAssetPriceInput,
	FindAssetPriceOptions,
	FindAssetPricesResponse,
	AssetPriceRangeResponse,
	AssetPriceLiveCacheResponse,
} from "../domain/asset-price.types";
import { FindAssetPricesUseCase } from "./usecases/find-asset-prices.usecase";
import { GetAssetPriceRangeUseCase } from "./usecases/get-asset-price-range.usecase";
import { GetAssetLivePriceUseCase } from "./usecases/get-asset-live-price.usecase";
import { SyncAssetPricesUseCase } from "./usecases/sync-asset-prices.usecase";
import { UpsertAssetPriceUseCase } from "./usecases/upsert-asset-price.usecase";

@injectable()
export class AssetPriceService {
	constructor(
		private upsertAssetPriceUseCase: UpsertAssetPriceUseCase,
		private findAssetPricesUseCase: FindAssetPricesUseCase,
		private getAssetPriceRangeUseCase: GetAssetPriceRangeUseCase,
		private getAssetLivePriceUseCase: GetAssetLivePriceUseCase,
		private syncAssetPricesUseCase: SyncAssetPricesUseCase,
	) {}

	async upsertAssetPrices(inputs: CreateAssetPriceInput[]): Promise<void> {
		await this.upsertAssetPriceUseCase.execute(inputs);
	}

	async findAssetPrices(options?: FindAssetPriceOptions): Promise<FindAssetPricesResponse> {
		return await this.findAssetPricesUseCase.execute(options);
	}

	async getAssetPriceRange(asset: string, startAt?: number, endAt?: number): Promise<AssetPriceRangeResponse> {
		return await this.getAssetPriceRangeUseCase.execute(asset, startAt, endAt);
	}

	async getAssetLivePrice(assets: string[]): Promise<AssetPriceLiveCacheResponse> {
		return await this.getAssetLivePriceUseCase.execute(assets);
	}

	async syncAssetPrices(): Promise<CreateAssetPriceInput[]> {
		return await this.syncAssetPricesUseCase.execute();
	}
}
