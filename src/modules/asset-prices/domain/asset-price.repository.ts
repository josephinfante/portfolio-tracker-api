import { CreateAssetPriceInput, FindAssetPriceOptions, FindAssetPricesResponse } from "./asset-price.types";

export interface AssetPriceRepository {
	upsertMany(assetPrices: CreateAssetPriceInput[]): Promise<void>;
	findAll(options?: FindAssetPriceOptions): Promise<FindAssetPricesResponse>;
}
