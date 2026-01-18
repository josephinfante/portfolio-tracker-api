import { AssetPriceRepository } from "@modules/asset-prices/domain/asset-price.repository";
import { FindAssetPriceOptions, FindAssetPricesResponse } from "@modules/asset-prices/domain/asset-price.types";
import { TOKENS } from "@shared/container/tokens";
import { ValidationError } from "@shared/errors/domain/validation.error";
import { inject, injectable } from "tsyringe";

const parseNumber = (value: unknown) => {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}
	if (typeof value === "string" && value.trim().length) {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : undefined;
	}
	return undefined;
};

const parseStringArray = (value: unknown): string[] | undefined => {
	if (Array.isArray(value)) {
		const normalized = value
			.map((item) => (typeof item === "string" ? item.trim() : String(item).trim()))
			.filter((item) => item.length > 0);
		return normalized.length ? normalized : undefined;
	}
	if (typeof value === "string") {
		const normalized = value
			.split(",")
			.map((item) => item.trim())
			.filter((item) => item.length > 0);
		return normalized.length ? normalized : undefined;
	}
	return undefined;
};

const groupAssetPrices = (response: FindAssetPricesResponse): FindAssetPricesResponse => {
	const grouped = new Map<
		string,
		{
			asset: { id: string; name: string; symbol: string };
			quoteCurrency: string;
			prices: { price: number; source: string; priceAt: number }[];
		}
	>();

	for (const item of response.items) {
		const key = `${item.asset.id}:${item.quoteCurrency}`;
		const existing = grouped.get(key);
		if (existing) {
			existing.prices.push(...item.prices);
		} else {
			grouped.set(key, {
				asset: item.asset,
				quoteCurrency: item.quoteCurrency,
				prices: [...item.prices],
			});
		}
	}

	const items = Array.from(grouped.values())
		.sort((a, b) => {
			const symbolCompare = a.asset.symbol.localeCompare(b.asset.symbol);
			return symbolCompare !== 0 ? symbolCompare : a.quoteCurrency.localeCompare(b.quoteCurrency);
		})
		.map((item) => ({
			...item,
			prices: item.prices.sort((a, b) => {
				const priceCompare = b.priceAt - a.priceAt;
				return priceCompare !== 0 ? priceCompare : a.source.localeCompare(b.source);
			}),
		}));

	return { items, totalCount: response.totalCount };
};

@injectable()
export class FindAssetPricesUseCase {
	constructor(@inject(TOKENS.AssetPriceRepository) private assetPriceRepository: AssetPriceRepository) {}

	async execute(options?: FindAssetPriceOptions): Promise<FindAssetPricesResponse> {
		const assets = parseStringArray(options?.assets);
		const quoteCurrencies = parseStringArray(options?.quoteCurrencies);
		const sources = parseStringArray(options?.sources);

		const startAt = parseNumber(options?.startAt);
		const endAt = parseNumber(options?.endAt);

		const response = await this.assetPriceRepository.findAll({
			assets,
			quoteCurrencies,
			sources,
			startAt,
			endAt,
		});

		return groupAssetPrices(response);
	}
}
