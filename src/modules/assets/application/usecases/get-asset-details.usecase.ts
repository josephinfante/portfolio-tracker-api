import { FindAssetUseCase } from "@modules/assets/application/usecases/find-asset.usecase";
import { AssetEntity } from "@modules/assets/domain/asset.entity";
import { GetAssetLivePriceUseCase } from "@modules/asset-prices/application/usecases/get-asset-live-price.usecase";
import {
	normalizeTwelveDataQuoteResponse,
	requestProviderQuotes,
} from "@modules/asset-prices/infrastructure/providers/asset-price.provider";
import { TwelvedataProvider } from "@modules/asset-prices/infrastructure/providers/twelvedata.provider";
import {
	AssetPriceProvider,
	TwelveDataQuoteItem,
	TwelveDataQuoteResponse,
} from "@modules/asset-prices/infrastructure/providers/price-provider.interface";
import { ListAccountsUseCase } from "@modules/accounts/application/usecases/list-accounts.usecase";
import { GetAccountHoldingsUseCase } from "@modules/accounts/application/usecases/get-account-holdings.usecase";
import { ListTransactionsUseCase } from "@modules/transactions/application/usecases/list-transactions.usecase";
import { AssetDetailsResponse } from "../dtos/asset-details.response";
import { D } from "@shared/helpers/decimal";
import { injectable } from "tsyringe";

type AssetDetailsOptions = {
	quoteCurrency?: string;
	txLimit?: number;
};

const normalizeCurrencyCode = (value?: string) => value?.trim().toUpperCase() || "USD";

const toNumber = (value: unknown): number | undefined => {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}
	if (typeof value === "string" && value.trim().length) {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : undefined;
	}
	return undefined;
};

const getQuoteItem = (data: Record<string, TwelveDataQuoteItem> | null, symbol: string): TwelveDataQuoteItem | null => {
	if (!data) {
		return null;
	}
	return data[symbol] ?? data[symbol.toLowerCase()] ?? data[symbol.toUpperCase()] ?? null;
};

@injectable()
export class GetAssetDetailsUseCase {
	private priceProvider: AssetPriceProvider<{ quote: TwelveDataQuoteResponse; historical: unknown }> =
		new TwelvedataProvider();

	constructor(
		private readonly findAssetUseCase: FindAssetUseCase,
		private readonly getAssetLivePriceUseCase: GetAssetLivePriceUseCase,
		private readonly listAccountsUseCase: ListAccountsUseCase,
		private readonly getAccountHoldingsUseCase: GetAccountHoldingsUseCase,
		private readonly listTransactionsUseCase: ListTransactionsUseCase,
	) {}

	private convertUsdToQuote(value: number | null | undefined, fx: number): number | null {
		if (value === null || value === undefined || !Number.isFinite(value)) {
			return null;
		}
		if (!Number.isFinite(fx) || fx <= 0) {
			return value;
		}
		return D(value).mul(D(fx)).toNumber();
	}

	private async resolveFxRate(quoteCurrency: string): Promise<{ rate: number; effectiveQuote: string }> {
		const normalized = normalizeCurrencyCode(quoteCurrency);
		if (normalized === "USD") {
			return { rate: 1, effectiveQuote: "USD" };
		}

		try {
			const fxSymbol = `USD/${normalized}`;
			const data = await requestProviderQuotes(this.priceProvider, [fxSymbol]);
			const quoteMap = normalizeTwelveDataQuoteResponse(data);
			const fxItem = getQuoteItem(quoteMap, fxSymbol);
			const fxClose = fxItem ? toNumber(fxItem.close) : undefined;
			if (!fxClose || fxClose <= 0) {
				return { rate: 1, effectiveQuote: "USD" };
			}
			return { rate: fxClose, effectiveQuote: normalized };
		} catch {
			return { rate: 1, effectiveQuote: "USD" };
		}
	}

	private async resolveMarket(asset: AssetEntity) {
		// if (!asset.pricing_source) {
		// 	return null;
		// }

		try {
			const response = await this.getAssetLivePriceUseCase.execute([asset.id]);
			return response.items.find((item) => item.assetId === asset.id) ?? null;
		} catch {
			return null;
		}
	}

	private computeUnitPrice(quantity: number, totalAmount: number): number | null {
		if (!Number.isFinite(quantity) || quantity === 0 || !Number.isFinite(totalAmount)) {
			return null;
		}
		return Math.abs(totalAmount / quantity);
	}

	async execute(userId: string, assetId: string, options: AssetDetailsOptions = {}): Promise<AssetDetailsResponse> {
		const asset = await this.findAssetUseCase.execute(assetId);
		const requestedQuote = normalizeCurrencyCode(options.quoteCurrency);
		const txLimit = options.txLimit ?? 5;

		const { rate: fxRate, effectiveQuote } = await this.resolveFxRate(requestedQuote);
		const marketSnapshot = await this.resolveMarket(asset);

		const accountsResponse = await this.listAccountsUseCase.execute(userId, { pageSize: 0 });
		const holdingsByAccount = await Promise.all(
			accountsResponse.items.map(async (account) => ({
				account,
				holdings: await this.getAccountHoldingsUseCase.execute(userId, account.id, "USD"),
			})),
		);

		const accounts: AssetDetailsResponse["accounts"] = [];
		let totalQuantity = D(0);
		let totalEquityUsd = D(0);
		let totalCostBasisUsd = D(0);
		let totalUnrealizedUsd = D(0);
		let hasCostBasis = true;
		let hasUnrealized = true;

		for (const entry of holdingsByAccount) {
			const holding = entry.holdings.items.find((item) => item.assetId === asset.id);
			if (!holding || holding.quantity <= 0) {
				continue;
			}

			const quantity = D(holding.quantity);
			const equityUsd = D(holding.value?.amount ?? 0);

			totalQuantity = totalQuantity.plus(quantity);
			totalEquityUsd = totalEquityUsd.plus(equityUsd);

			if (holding.costBasis?.amount !== undefined && Number.isFinite(holding.costBasis.amount)) {
				totalCostBasisUsd = totalCostBasisUsd.plus(holding.costBasis.amount);
			} else {
				hasCostBasis = false;
			}

			if (holding.unrealizedPnl?.amount !== undefined && Number.isFinite(holding.unrealizedPnl.amount)) {
				totalUnrealizedUsd = totalUnrealizedUsd.plus(holding.unrealizedPnl.amount);
			} else {
				hasUnrealized = false;
			}

			const equity = this.convertUsdToQuote(holding.value?.amount ?? 0, fxRate) ?? 0;

			accounts.push({
				accountId: entry.account.id,
				accountName: entry.account.name,
				platform: entry.account.platform
					? {
							id: entry.account.platform.id,
							name: entry.account.platform.name,
							type: entry.account.platform.type,
						}
					: undefined,
				quantity: Number(holding.quantity),
				equity,
			});
		}

		const totalQuantityValue = totalQuantity.toNumber();
		const totalEquityValue = this.convertUsdToQuote(totalEquityUsd.toNumber(), fxRate) ?? 0;

		let avgBuyPrice: number | null = null;
		if (hasCostBasis && totalQuantityValue > 0) {
			const avgUsd = totalCostBasisUsd.div(totalQuantity).toNumber();
			avgBuyPrice = this.convertUsdToQuote(avgUsd, fxRate);
		}

		let unrealizedPnlAmount: number | null = null;
		let unrealizedPnlPercent: number | null = null;
		if (hasUnrealized && hasCostBasis && totalCostBasisUsd.gt(0)) {
			unrealizedPnlAmount = this.convertUsdToQuote(totalUnrealizedUsd.toNumber(), fxRate);
			unrealizedPnlPercent = totalUnrealizedUsd.div(totalCostBasisUsd).mul(100).toNumber();
		}

		const transactions = await this.listTransactionsUseCase.execute(userId, {
			pageSize: txLimit,
			page: 1,
			asset: asset.id,
			sortBy: "transactionDate",
			sortDirection: "desc",
		});

		const recentTransactions = transactions.items.map((tx) => ({
			id: tx.id,
			transactionType: tx.transactionType,
			quantity: tx.quantity,
			unitPrice: this.computeUnitPrice(tx.quantity, tx.totalAmount),
			executedAt: tx.transactionDate,
			accountId: tx.accountId,
		}));

		const market = marketSnapshot
			? {
					quoteCurrency: effectiveQuote,
					price: this.convertUsdToQuote(marketSnapshot.price, fxRate) ?? marketSnapshot.price,
					changeAmount: this.convertUsdToQuote(marketSnapshot.changeAmount ?? null, fxRate),
					changePercent: marketSnapshot.changePercent ?? null,
					high: this.convertUsdToQuote(marketSnapshot.high ?? null, fxRate),
					low: this.convertUsdToQuote(marketSnapshot.low ?? null, fxRate),
					open: this.convertUsdToQuote(marketSnapshot.open ?? null, fxRate),
					previousClose: this.convertUsdToQuote(marketSnapshot.previousClose ?? null, fxRate),
					volume: marketSnapshot.volume ?? null,
					marketCap: this.convertUsdToQuote(marketSnapshot.marketCap ?? null, fxRate),
					marketCapRank: marketSnapshot.marketCapRank ?? null,
					isMarketOpen: marketSnapshot.isMarketOpen ?? null,
					source: marketSnapshot.source,
					providerAssetKey: marketSnapshot.providerAssetKey ?? null,
					updatedAt: marketSnapshot.updatedAt,
					providerUpdatedAt: marketSnapshot.providerUpdatedAt ?? null,
				}
			: null;

		return {
			asset: {
				id: asset.id,
				symbol: asset.symbol,
				name: asset.name,
				assetType: asset.asset_type,
				description: null,
				logoUrl: null,
				pricingSource: asset.pricing_source ?? null,
				externalId: asset.external_id ?? null,
				createdAt: asset.createdAt,
				updatedAt: asset.updatedAt,
			},
			market,
			holdings: {
				baseCurrency: effectiveQuote,
				totalQuantity: totalQuantityValue,
				avgBuyPrice,
				totalEquity: totalEquityValue,
				unrealizedPnlAmount,
				unrealizedPnlPercent,
			},
			accounts,
			recentTransactions,
		};
	}
}
