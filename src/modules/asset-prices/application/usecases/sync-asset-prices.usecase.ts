import { AssetRepository } from "@modules/assets/domain/asset.repository";
import { AssetType } from "@modules/assets/domain/asset.types";
import { CreateAssetPriceInput } from "@modules/asset-prices/domain/asset-price.types";
import {
	buildPriceInputs,
	getBinanceSymbolForAsset,
	getProviderSymbolForAsset,
	normalizeTwelveDataQuoteResponse,
	requestProviderQuotesWithCache,
} from "@modules/asset-prices/infrastructure/providers/asset-price.provider";
import { BinanceProvider } from "@modules/asset-prices/infrastructure/providers/binance.provider";
import { TwelvedataProvider } from "@modules/asset-prices/infrastructure/providers/twelvedata.provider";
import {
	AssetPriceProvider,
	TwelveDataQuoteResponse,
} from "@modules/asset-prices/infrastructure/providers/price-provider.interface";
import { AssetPriceRepository } from "@modules/asset-prices/domain/asset-price.repository";
import { TOKENS } from "@shared/container/tokens";
import { logger } from "@shared/logger";
import { inject, injectable } from "tsyringe";

@injectable()
export class SyncAssetPricesUseCase {
	private priceProvider: AssetPriceProvider<{ quote: TwelveDataQuoteResponse; historical: unknown }> =
		new TwelvedataProvider();
	private cryptoPriceProvider: AssetPriceProvider<{ quote: TwelveDataQuoteResponse; historical: unknown }> =
		new BinanceProvider();

	constructor(
		@inject(TOKENS.AssetRepository) private assetRepository: AssetRepository,
		@inject(TOKENS.AssetPriceRepository) private assetPriceRepository: AssetPriceRepository,
	) {}

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

		const cryptoAssets = allowedAssets.filter(
			(asset) => asset.asset_type === AssetType.crypto || asset.asset_type === AssetType.stablecoin,
		);
		const otherAssets = allowedAssets.filter(
			(asset) => asset.asset_type !== AssetType.crypto && asset.asset_type !== AssetType.stablecoin,
		);

		const symbols = otherAssets.map((asset) => getProviderSymbolForAsset(asset));
		if (symbols.length) {
			try {
				const data = await requestProviderQuotesWithCache(
					this.priceProvider,
					otherAssets,
					this.assetPriceRepository,
					symbols,
					{ persist: false },
				);
				const normalized = normalizeTwelveDataQuoteResponse(data);
				if (normalized) {
					results.push(...buildPriceInputs(this.priceProvider, otherAssets, normalized));
				} else if (data) {
					logger.warn("Price provider returned invalid data");
				} else {
					logger.warn("Price provider returned no data");
				}
			} catch (error) {
				logger.error({ err: error }, "Price provider sync failed");
			}
		}

		const cryptoSymbols = cryptoAssets.map((asset) => getBinanceSymbolForAsset(asset)).filter((symbol) => symbol);
		if (cryptoSymbols.length) {
			try {
				const data = await requestProviderQuotesWithCache(
					this.cryptoPriceProvider,
					cryptoAssets,
					this.assetPriceRepository,
					cryptoSymbols,
					{ persist: false, symbolResolver: getBinanceSymbolForAsset },
				);
				const normalized = normalizeTwelveDataQuoteResponse(data);
				if (normalized) {
					results.push(
						...buildPriceInputs(this.cryptoPriceProvider, cryptoAssets, normalized, {
							symbolResolver: getBinanceSymbolForAsset,
						}),
					);
				} else if (data) {
					logger.warn("Crypto price provider returned invalid data");
				} else {
					logger.warn("Crypto price provider returned no data");
				}
			} catch (error) {
				logger.error({ err: error }, "Crypto price provider sync failed");
			}
		}

		return results;
	}
}
