import { AssetRepository } from "@modules/assets/domain/asset.repository";
import { AssetType } from "@modules/assets/domain/asset.types";
import { CreateAssetPriceInput } from "@modules/asset-prices/domain/asset-price.types";
import { TwelvedataProvider } from "@modules/asset-prices/infrastructure/providers/twelvedata.provider";
import {
	buildPriceInputs,
	getProviderSymbolForAsset,
	isTwelveDataQuoteResponse,
	requestProviderQuotes,
} from "@modules/asset-prices/infrastructure/providers/asset-price.provider";
import { TOKENS } from "@shared/container/tokens";
import { logger } from "@shared/logger";
import { inject, injectable } from "tsyringe";

@injectable()
export class SyncAssetPricesUseCase {
	private priceProvider = new TwelvedataProvider();

	constructor(@inject(TOKENS.AssetRepository) private assetRepository: AssetRepository) {}

	async execute(): Promise<CreateAssetPriceInput[]> {
		const { items } = await this.assetRepository.findAll();
		if (!items.length) {
			return [];
		}

		const allowedAssets = items.filter((asset) =>
			[AssetType.crypto, AssetType.stablecoin, AssetType.fiat, AssetType.stock, AssetType.etf].includes(
				asset.asset_type,
			),
		);
		if (!allowedAssets.length) {
			return [];
		}

		const results: CreateAssetPriceInput[] = [];

		const symbols = allowedAssets.map((asset) => getProviderSymbolForAsset(asset));
		if (symbols.length) {
			try {
				const data = await requestProviderQuotes(this.priceProvider, symbols);
				if (isTwelveDataQuoteResponse(data)) {
					results.push(...buildPriceInputs(this.priceProvider, allowedAssets, data));
				} else if (data) {
					logger.warn("Price provider returned invalid data");
				} else {
					logger.warn("Price provider returned no data");
				}
			} catch (error) {
				logger.error({ err: error }, "Price provider sync failed");
			}
		}

		console.log("RESULTS", results);
		return results;
	}
}
