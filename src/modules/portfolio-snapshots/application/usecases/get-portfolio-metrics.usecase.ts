import { PortfolioSnapshotRepository } from "@modules/portfolio-snapshots/domain/portfolio-snapshot.repository";
import { CreateTodaySnapshotUseCase } from "@modules/portfolio-snapshots/application/usecases/create-today-snapshot.usecase";
import { TransactionRepository } from "@modules/transactions/domain/transaction.repository";
import { AssetRepository } from "@modules/assets/domain/asset.repository";
import { AssetType } from "@modules/assets/domain/asset.types";
import { AssetPriceService } from "@modules/asset-prices/application/asset-price.service";
import { ExchangeRateService } from "@modules/exchange-rates/application/exchange-rate.service";
import { TransactionType } from "@modules/transactions/domain/transaction.types";
import { PortfolioMetricsResponse } from "@modules/portfolio-snapshots/domain/portfolio-metrics.types";
import { TOKENS } from "@shared/container/tokens";
import { ValidationError } from "@shared/errors/domain/validation.error";
import { getTodayInTimezone } from "@shared/helpers/date";
import { D, toFixed } from "@shared/helpers/decimal";
import { DateTime } from "luxon";
import { inject, injectable } from "tsyringe";

type CashflowResult = {
	depositsUsd: number;
	withdrawalsUsd: number;
};

type FxRatePoint = {
	rateAt: number;
	fxUsdToBase: number;
};

const DEFAULT_TIMEZONE = "America/Lima";

const toNumber = (value: unknown): number => {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}
	if (typeof value === "string" && value.trim().length) {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : 0;
	}
	return 0;
};

const normalizeTimestamp = (value: number): number => {
	return value < 1_000_000_000_000 ? value * 1000 : value;
};

@injectable()
export class GetPortfolioMetricsUseCase {
	constructor(
		@inject(TOKENS.PortfolioSnapshotRepository)
		private readonly portfolioSnapshotRepository: PortfolioSnapshotRepository,
		private readonly createTodaySnapshotUseCase: CreateTodaySnapshotUseCase,
		@inject(TOKENS.TransactionRepository)
		private readonly transactionRepository: TransactionRepository,
		@inject(TOKENS.AssetRepository)
		private readonly assetRepository: AssetRepository,
		private readonly assetPriceService: AssetPriceService,
		private readonly exchangeRateService: ExchangeRateService,
	) {}

	async execute(userId: string, timeZone?: string): Promise<PortfolioMetricsResponse> {
		if (!userId || typeof userId !== "string") {
			throw new ValidationError("Invalid user ID", "userId");
		}

		const resolvedTimeZone = timeZone?.trim() || DEFAULT_TIMEZONE;
		const todayDate = getTodayInTimezone(resolvedTimeZone);
		const yesterdayDate =
			DateTime.fromISO(todayDate, { zone: resolvedTimeZone }).minus({ days: 1 }).toISODate() ?? todayDate;

		const fxRate = await this.exchangeRateService.getFxUsdToBase(userId);

		let todaySnapshot = await this.portfolioSnapshotRepository.findByUserAndDate(userId, todayDate);
		if (!todaySnapshot) {
			const built = await this.createTodaySnapshotUseCase.execute(userId);
			todaySnapshot = await this.portfolioSnapshotRepository.findByUserAndDate(userId, built.snapshotDate);
		}

		const yesterdaySnapshot = await this.portfolioSnapshotRepository.findByUserAndDate(userId, yesterdayDate);

		const netWorthUsdToday = toNumber(todaySnapshot?.totalValueUsd ?? 0);
		const netWorthBaseToday = toNumber(todaySnapshot?.totalValueBase ?? 0);
		const netWorthUsdYesterday = toNumber(yesterdaySnapshot?.totalValueUsd ?? 0);
		const netWorthBaseYesterday = toNumber(yesterdaySnapshot?.totalValueBase ?? 0);

		const dailyPnLUsd = yesterdaySnapshot ? netWorthUsdToday - netWorthUsdYesterday : 0;
		const dailyPnLBase = yesterdaySnapshot ? netWorthBaseToday - netWorthBaseYesterday : 0;
		const dailyPnLPercentUsd =
			yesterdaySnapshot && netWorthUsdYesterday !== 0 ? dailyPnLUsd / netWorthUsdYesterday : 0;

		const todayStart = DateTime.fromISO(todayDate, { zone: resolvedTimeZone }).startOf("day").toMillis();
		const todayEnd = DateTime.fromISO(todayDate, { zone: resolvedTimeZone }).endOf("day").toMillis();

		const cashflowToday = await this.calculateCashflowsUsd(userId, fxRate.baseCurrency, fxRate.fxUsdToBase, {
			startAt: todayStart,
			endAt: todayEnd,
		});

		const netCashFlowUsd = cashflowToday.depositsUsd - cashflowToday.withdrawalsUsd;
		const dailyPnLRealUsd = yesterdaySnapshot ? dailyPnLUsd - netCashFlowUsd : 0;
		const dailyPnLRealBase = dailyPnLRealUsd * fxRate.fxUsdToBase;
		const dailyPnLRealPercentUsd =
			yesterdaySnapshot && netWorthUsdYesterday !== 0 ? dailyPnLRealUsd / netWorthUsdYesterday : 0;

		const cashflowTotal = await this.calculateCashflowsUsd(userId, fxRate.baseCurrency, fxRate.fxUsdToBase);
		const totalInvestedUsd = cashflowTotal.depositsUsd - cashflowTotal.withdrawalsUsd;
		const totalInvestedBase = totalInvestedUsd * fxRate.fxUsdToBase;

		const cashBalance = await this.calculateCashBalance(todaySnapshot?.id, userId, fxRate.baseCurrency);

		return {
			asOfDate: todaySnapshot?.snapshotDate ?? todayDate,
			baseCurrencyCode: fxRate.baseCurrency,
			fxUsdToBase: fxRate.fxUsdToBase,
			netWorth: {
				usd: netWorthUsdToday,
				base: netWorthBaseToday,
			},
			dailyPnL: {
				usd: dailyPnLUsd,
				base: dailyPnLBase,
				percentUsd: dailyPnLPercentUsd,
			},
			dailyPnLReal: {
				usd: dailyPnLRealUsd,
				base: dailyPnLRealBase,
				percentUsd: dailyPnLRealPercentUsd,
				netCashFlowUsd,
			},
			totalInvested: {
				usd: totalInvestedUsd,
				base: totalInvestedBase,
			},
			cashBalance: cashBalance ?? undefined,
		};
	}

	private async calculateCashBalance(snapshotId: string | undefined, userId: string, baseCurrency: string) {
		if (!snapshotId) {
			return null;
		}

		const details = await this.portfolioSnapshotRepository.findWithDetails(userId, snapshotId);
		if (!details) {
			return null;
		}

		let cashUsd = D(0);
		let cashBase = D(0);

		for (const item of details.items) {
			const symbol = item.assetSymbol.toUpperCase();
			const isUsd = symbol === "USD";
			const isBase = symbol === baseCurrency.toUpperCase();
			const isStable = item.assetType === AssetType.stablecoin;

			if (!isUsd && !isBase && !isStable) {
				continue;
			}

			cashUsd = cashUsd.plus(item.valueUsd);
			cashBase = cashBase.plus(item.valueBase);
		}

		return {
			usd: Number(toFixed(cashUsd)),
			base: Number(toFixed(cashBase)),
		};
	}

	private async calculateCashflowsUsd(
		userId: string,
		baseCurrency: string,
		fxUsdToBaseFallback: number,
		dateRange?: { startAt?: number; endAt?: number },
	): Promise<CashflowResult> {
		const [deposits, withdrawals] = await Promise.all([
			this.transactionRepository.findByUserId(userId, {
				transactionType: TransactionType.DEPOSIT,
				startDate: dateRange?.startAt,
				endDate: dateRange?.endAt,
			}),
			this.transactionRepository.findByUserId(userId, {
				transactionType: TransactionType.WITHDRAW,
				startDate: dateRange?.startAt,
				endDate: dateRange?.endAt,
			}),
		]);

		const depositItems = deposits.items;
		const withdrawalItems = withdrawals.items;
		const allTransactions = [...depositItems, ...withdrawalItems];

		if (!allTransactions.length) {
			return { depositsUsd: 0, withdrawalsUsd: 0 };
		}

		const assetIds = Array.from(new Set(allTransactions.map((tx) => tx.assetId)));
		const assets = await this.assetRepository.findByIdentifiers(assetIds);
		const assetMap = new Map(assets.map((asset) => [asset.id, asset]));

		const { startAt, endAt } = this.resolveDateRange(allTransactions, dateRange);
		const priceMap = await this.buildAssetPriceMap(assetMap, baseCurrency, startAt, endAt);
		const fxRates = await this.buildFxRateMap(userId, baseCurrency, startAt, endAt, fxUsdToBaseFallback);

		let depositsUsd = D(0);
		let withdrawalsUsd = D(0);

		for (const tx of depositItems) {
			const valueUsd = this.resolveTransactionUsdValue(tx, assetMap, priceMap, fxRates, baseCurrency, fxUsdToBaseFallback);
			depositsUsd = depositsUsd.plus(valueUsd);
		}

		for (const tx of withdrawalItems) {
			const valueUsd = this.resolveTransactionUsdValue(tx, assetMap, priceMap, fxRates, baseCurrency, fxUsdToBaseFallback);
			withdrawalsUsd = withdrawalsUsd.plus(valueUsd);
		}

		return {
			depositsUsd: Number(toFixed(depositsUsd)),
			withdrawalsUsd: Number(toFixed(withdrawalsUsd)),
		};
	}

	private resolveDateRange(
		transactions: { transactionDate: number }[],
		dateRange?: { startAt?: number; endAt?: number },
	) {
		const normalized = transactions.map((tx) => normalizeTimestamp(tx.transactionDate));
		const minDate = Math.min(...normalized);
		const maxDate = Math.max(...normalized);
		return {
			startAt: dateRange?.startAt ?? minDate,
			endAt: dateRange?.endAt ?? maxDate,
		};
	}

	private async buildAssetPriceMap(
		assetMap: Map<string, { id: string; asset_type: AssetType; symbol: string }>,
		baseCurrency: string,
		startAt: number,
		endAt: number,
	) {
		const priceAssetIds = Array.from(assetMap.values())
			.filter((asset) => {
				const symbol = asset.symbol.toUpperCase();
				const isUsd = symbol === "USD";
				const isBase = symbol === baseCurrency.toUpperCase();
				const isStable = asset.asset_type === AssetType.stablecoin;
				return !isUsd && !isBase && !isStable;
			})
			.map((asset) => asset.id);

		if (!priceAssetIds.length) {
			return new Map<string, { price: number; priceAt: number }[]>();
		}

		const prices = await this.assetPriceService.findAssetPrices({
			assets: priceAssetIds,
			quoteCurrencies: ["USD"],
			startAt,
			endAt,
		});

		const priceMap = new Map<string, { price: number; priceAt: number }[]>();
		for (const item of prices.items) {
			priceMap.set(item.asset.id, item.prices.map((price) => ({ price: price.price, priceAt: price.priceAt })));
		}

		return priceMap;
	}

	private async buildFxRateMap(
		userId: string,
		baseCurrency: string,
		startAt: number,
		endAt: number,
		fxUsdToBaseFallback: number,
	): Promise<FxRatePoint[]> {
		if (baseCurrency.toUpperCase() === "USD") {
			return [{ rateAt: endAt, fxUsdToBase: 1 }];
		}

		const response = await this.exchangeRateService.findExchangeRates(userId, {
			baseCurrency: "USD",
			quoteCurrency: baseCurrency,
			startRateAt: startAt,
			endRateAt: endAt,
		});

		const rates = response.items[0]?.rates ?? [];
		if (!rates.length) {
			return [{ rateAt: endAt, fxUsdToBase: fxUsdToBaseFallback }];
		}

		return rates
			.map((rate) => ({
				rateAt: normalizeTimestamp(rate.rateAt),
				fxUsdToBase: D(rate.buyRate).plus(rate.sellRate).div(2).toNumber(),
			}))
			.sort((a, b) => b.rateAt - a.rateAt);
	}

	private resolveTransactionUsdValue(
		tx: { assetId: string; quantity: number; transactionDate: number; asset?: { symbol: string } },
		assetMap: Map<string, { asset_type: AssetType; symbol: string }>,
		priceMap: Map<string, { price: number; priceAt: number }[]>,
		fxRates: FxRatePoint[],
		baseCurrency: string,
		fxUsdToBaseFallback: number,
	) {
		const asset = assetMap.get(tx.assetId);
		const symbol = (asset?.symbol ?? tx.asset?.symbol ?? "").toUpperCase();
		const assetType = asset?.asset_type;
		const quantity = D(tx.quantity).abs();
		const txDate = normalizeTimestamp(tx.transactionDate);

		if (symbol === "USD" || assetType === AssetType.stablecoin) {
			return quantity.toNumber();
		}

		if (symbol === baseCurrency.toUpperCase()) {
			const fxUsdToBase = this.resolveFxUsdToBaseAt(fxRates, txDate, fxUsdToBaseFallback);
			return fxUsdToBase > 0 ? quantity.div(fxUsdToBase).toNumber() : 0;
		}

		const price = this.resolvePriceAt(priceMap.get(tx.assetId), txDate);
		if (!price) {
			return 0;
		}

		return quantity.mul(price).toNumber();
	}

	private resolveFxUsdToBaseAt(rates: FxRatePoint[], txDate: number, fallback: number): number {
		const match = rates.find((rate) => rate.rateAt <= txDate);
		return match?.fxUsdToBase ?? fallback;
	}

	private resolvePriceAt(prices: { price: number; priceAt: number }[] | undefined, txDate: number): number | null {
		if (!prices?.length) {
			return null;
		}
		const match = prices.find((price) => price.priceAt <= txDate);
		return match?.price ?? prices[prices.length - 1]?.price ?? null;
	}
}
