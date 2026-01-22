import { GetHoldingsByAccountUseCase } from "@modules/transactions/application/usecases/get-holdings-by-account.usecase";
import { GetAssetLivePriceUseCase } from "@modules/asset-prices/application/usecases/get-asset-live-price.usecase";
import { GetFxUsdToBaseUseCase } from "@modules/exchange-rates/application/usecases/get-fx-usd-to-base.usecase";
import { BuiltSnapshot } from "@modules/portfolio-snapshots/domain/portfolio-snapshot.entity";
import { AssetRepository } from "@modules/assets/domain/asset.repository";
import { AssetType } from "@modules/assets/domain/asset.types";
import { ValidationError } from "@shared/errors/domain/validation.error";
import { TOKENS } from "@shared/container/tokens";
import { inject, injectable } from "tsyringe";
import { D, toFixed } from "@shared/helpers/decimal";
import { DateTime } from "luxon";
import { getTodayInTimezone } from "@shared/helpers/date";

@injectable()
export class BuildSnapshotUseCase {
	constructor(
		private getHoldingsByAccountUseCase: GetHoldingsByAccountUseCase,
		private getAssetLivePriceUseCase: GetAssetLivePriceUseCase,
		private getFxUsdToBaseUseCase: GetFxUsdToBaseUseCase,
		@inject(TOKENS.AssetRepository) private assetRepository: AssetRepository,
	) {}

	async execute(userId: string, timeZone?: string): Promise<BuiltSnapshot> {
		if (!userId || typeof userId !== "string") {
			throw new ValidationError("Invalid user ID", "userId");
		}

		const [holdings, fxRate] = await Promise.all([
			this.getHoldingsByAccountUseCase.execute(userId),
			this.getFxUsdToBaseUseCase.execute(userId),
		]);

		const resolvedTimeZone = timeZone && typeof timeZone === "string" ? timeZone : DateTime.local().zoneName;
		const snapshotDate = getTodayInTimezone(resolvedTimeZone);
		const baseCurrencyCode = fxRate.baseCurrency;
		const fxUsdToBase = fxRate.fxUsdToBase;

		if (!holdings.length) {
			return {
				snapshotDate,
				baseCurrencyCode,
				fxUsdToBase: fxUsdToBase,
				totalValueUsd: 0,
				totalValueBase: 0,
				items: [],
			};
		}

		const assetIds = Array.from(new Set(holdings.map((holding) => holding.assetId)));
		const [livePrices, assets] = await Promise.all([
			this.getAssetLivePriceUseCase.execute(assetIds),
			this.assetRepository.findByIdentifiers(assetIds),
		]);

		const priceMap = new Map(livePrices.items.map((item) => [item.assetId, item]));
		const assetMap = new Map(assets.map((asset) => [asset.id, asset]));

		let totalValueUsd = D(0);
		let totalValueBase = D(0);

		const items = holdings.map((holding) => {
			const quantity = D(holding.quantity);
			const asset = assetMap.get(holding.assetId);
			const priceItem = priceMap.get(holding.assetId);
			const rawPrice = priceItem?.price ?? 0;
			const quoteCurrency = priceItem?.quoteCurrency?.toUpperCase();
			const assetSymbol = asset?.symbol?.toUpperCase();

			let priceUsd = D(rawPrice);
			let priceBase = D(rawPrice).mul(D(fxUsdToBase));

			if (asset?.asset_type === AssetType.fiat && assetSymbol) {
				if (assetSymbol === "USD") {
					priceUsd = D(1);
					priceBase = D(fxUsdToBase);
				} else if (assetSymbol === baseCurrencyCode) {
					priceBase = D(1);
					priceUsd = fxUsdToBase > 0 ? D(1).div(D(fxUsdToBase)) : D(0);
				} else if (rawPrice > 0 && quoteCurrency === assetSymbol) {
					priceUsd = D(1).div(D(rawPrice));
					priceBase = priceUsd.mul(D(fxUsdToBase));
				}
			}

			if (quoteCurrency === baseCurrencyCode && fxUsdToBase > 0) {
				priceBase = D(rawPrice);
				priceUsd = D(rawPrice).div(D(fxUsdToBase));
			}

			const valueUsd = quantity.mul(priceUsd);
			const valueBase = quantity.mul(priceBase);

			totalValueUsd = totalValueUsd.plus(valueUsd);
			totalValueBase = totalValueBase.plus(valueBase);

			return {
				accountId: holding.accountId,
				assetId: holding.assetId,
				quantity: Number(toFixed(quantity)),
				priceUsd: Number(toFixed(priceUsd)),
				priceBase: Number(toFixed(priceBase)),
				valueUsd: Number(toFixed(valueUsd)),
				valueBase: Number(toFixed(valueBase)),
			};
		});

		return {
			snapshotDate,
			baseCurrencyCode,
			fxUsdToBase: fxUsdToBase,
			totalValueUsd: Number(toFixed(totalValueUsd)),
			totalValueBase: Number(toFixed(totalValueBase)),
			items,
		};
	}
}
