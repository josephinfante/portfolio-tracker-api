import { AssetRepository } from "@modules/assets/domain/asset.repository";
import { UserRepository } from "@modules/users/domain/user.repository";
import { TOKENS } from "@shared/container/tokens";
import { NotFoundError } from "@shared/errors/domain/not-found.error";
import { ValidationError } from "@shared/errors/domain/validation.error";
import { inject, injectable } from "tsyringe";
import { FxRate } from "@modules/exchange-rates/domain/exchange-rate.types";
import { requestProviderQuotesWithCache } from "@modules/asset-prices/infrastructure/providers/asset-price.provider";
import { TwelvedataProvider } from "@modules/asset-prices/infrastructure/providers/twelvedata.provider";
import {
	AssetPriceProvider,
	TwelveDataQuoteResponse,
	TwelveDataQuoteItem,
} from "@modules/asset-prices/infrastructure/providers/price-provider.interface";
import { AssetPriceRepository } from "@modules/asset-prices/domain/asset-price.repository";

const normalizeCurrencyCode = (value: string) => value.trim().toUpperCase();

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

const toDate = (value: unknown): Date | null => {
	if (value instanceof Date) {
		return value;
	}
	if (typeof value === "number" && Number.isFinite(value)) {
		const ms = value < 1_000_000_000_000 ? value * 1000 : value;
		return new Date(ms);
	}
	if (typeof value === "string" && value.trim().length) {
		const parsed = Date.parse(value);
		if (Number.isFinite(parsed)) {
			return new Date(parsed);
		}
	}
	return null;
};

const getQuoteItem = (
	data: TwelveDataQuoteResponse | TwelveDataQuoteItem | null,
	symbol: string,
): TwelveDataQuoteItem | null => {
	if (!data || typeof data !== "object") {
		return null;
	}
	if ("close" in data) {
		return data as TwelveDataQuoteItem;
	}
	const quoteMap = data as Record<string, TwelveDataQuoteItem>;
	return quoteMap[symbol] ?? quoteMap[symbol.toLowerCase()] ?? quoteMap[symbol.toUpperCase()] ?? null;
};

@injectable()
export class GetFxUsdToBaseUseCase {
	private priceProvider: AssetPriceProvider<{ quote: TwelveDataQuoteResponse; historical: unknown }> =
		new TwelvedataProvider();

	constructor(
		@inject(TOKENS.UserRepository) private userRepository: UserRepository,
		@inject(TOKENS.AssetRepository) private assetRepository: AssetRepository,
		@inject(TOKENS.AssetPriceRepository) private assetPriceRepository: AssetPriceRepository,
	) {}

	async execute(userId: string): Promise<FxRate> {
		if (!userId || typeof userId !== "string") {
			throw new ValidationError("Invalid user ID", "userId");
		}

		const user = await this.userRepository.findById(userId);
		if (!user) {
			throw new NotFoundError(`User ${userId} not found`);
		}

		const baseCurrency = normalizeCurrencyCode(user.baseCurrency);
		if (baseCurrency === "USD") {
			return {
				baseCurrency,
				fxUsdToBase: 1,
				asOf: new Date(),
			};
		}

		const symbol = `USD/${baseCurrency}`;
		const assets = await this.assetRepository.findByIdentifiers([baseCurrency]);
		const fxAsset = assets.find((asset) => asset.symbol.toUpperCase() === baseCurrency) ?? assets[0];
		const data = fxAsset
			? await requestProviderQuotesWithCache(this.priceProvider, [fxAsset], this.assetPriceRepository, [symbol])
			: await this.priceProvider.getQuote([symbol]);
		const quoteItem = getQuoteItem(data, symbol);
		const close = quoteItem ? toNumber(quoteItem.close) : undefined;

		if (!close) {
			throw new ValidationError("Unable to resolve FX rate", "baseCurrency");
		}

		const asOf = (quoteItem && (toDate(quoteItem.timestamp) || toDate(quoteItem.datetime))) ?? new Date();

		return {
			baseCurrency,
			fxUsdToBase: close,
			asOf,
		};
	}
}
