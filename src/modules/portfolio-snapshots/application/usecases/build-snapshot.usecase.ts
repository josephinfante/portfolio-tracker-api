import { GetHoldingsByAccountUseCase } from "@modules/transactions/application/usecases/get-holdings-by-account.usecase";
import { GetAssetLivePriceUseCase } from "@modules/asset-prices/application/usecases/get-asset-live-price.usecase";
import { GetFxUsdToBaseUseCase } from "@modules/exchange-rates/application/usecases/get-fx-usd-to-base.usecase";
import { BuiltSnapshot } from "@modules/portfolio-snapshots/domain/portfolio-snapshot.entity";
import { ValidationError } from "@shared/errors/domain/validation.error";
import { injectable } from "tsyringe";

const toDateString = (value: Date): string => value.toISOString().slice(0, 10);

@injectable()
export class BuildSnapshotUseCase {
	constructor(
		private getHoldingsByAccountUseCase: GetHoldingsByAccountUseCase,
		private getAssetLivePriceUseCase: GetAssetLivePriceUseCase,
		private getFxUsdToBaseUseCase: GetFxUsdToBaseUseCase,
	) {}

	async execute(userId: string): Promise<BuiltSnapshot> {
		if (!userId || typeof userId !== "string") {
			throw new ValidationError("Invalid user ID", "userId");
		}

		const [holdings, fxRate] = await Promise.all([
			this.getHoldingsByAccountUseCase.execute(userId),
			this.getFxUsdToBaseUseCase.execute(userId),
		]);

		const snapshotDate = toDateString(new Date());
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
		const livePrices = await this.getAssetLivePriceUseCase.execute(assetIds);

		const priceMap = new Map(livePrices.items.map((item) => [item.assetId, item]));

		let totalValueUsd = 0;
		let totalValueBase = 0;

		const items = holdings.map((holding) => {
			const quantity = holding.quantity;
			const priceItem = priceMap.get(holding.assetId);
			const rawPrice = priceItem?.price ?? 0;
			const quoteCurrency = priceItem?.quoteCurrency?.toUpperCase();

			let priceUsd = rawPrice;
			let priceBase = rawPrice * fxUsdToBase;

			if (quoteCurrency === baseCurrencyCode && fxUsdToBase > 0) {
				priceBase = rawPrice;
				priceUsd = rawPrice / fxUsdToBase;
			}

			const valueUsd = quantity * priceUsd;
			const valueBase = quantity * priceBase;

			totalValueUsd += valueUsd;
			totalValueBase += valueBase;

			return {
				accountId: holding.accountId,
				assetId: holding.assetId,
				quantity: quantity,
				priceUsd: priceUsd,
				priceBase: priceBase,
				valueUsd: valueUsd,
				valueBase: valueBase,
			};
		});

		return {
			snapshotDate,
			baseCurrencyCode,
			fxUsdToBase: fxUsdToBase,
			totalValueUsd: totalValueUsd,
			totalValueBase: totalValueBase,
			items,
		};
	}
}
