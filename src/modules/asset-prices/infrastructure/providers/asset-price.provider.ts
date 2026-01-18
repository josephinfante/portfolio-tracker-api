import { AssetEntity } from "@modules/assets/domain/asset.entity";
import { AssetType } from "@modules/assets/domain/asset.types";
import { AssetPriceLiveCache, CreateAssetPriceInput } from "@modules/asset-prices/domain/asset-price.types";
import {
	AssetPriceProvider,
	AssetPriceProviderResponseMap,
	TwelveDataQuoteItem,
	TwelveDataQuoteResponse,
} from "./price-provider.interface";

const normalizeSymbol = (value?: string) => (typeof value === "string" ? value.trim().toLowerCase() : "");

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

const toTimestamp = (value: unknown): number | undefined => {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value < 1_000_000_000_000 ? value * 1000 : value;
	}
	if (value instanceof Date) {
		return value.getTime();
	}
	if (typeof value === "string" && value.length) {
		const trimmed = value.trim();
		if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
			const parsed = Date.parse(`${trimmed}T00:00:00Z`);
			return Number.isFinite(parsed) ? parsed : undefined;
		}
		const parsed = Date.parse(trimmed);
		return Number.isFinite(parsed) ? parsed : undefined;
	}
	return undefined;
};

export async function requestProviderQuotes<TMap extends AssetPriceProviderResponseMap>(
	provider: AssetPriceProvider<TMap>,
	symbols: string[],
): Promise<TMap["quote"] | null> {
	if (!symbols.length) {
		return null;
	}
	return provider.getQuote(symbols);
}

type QuoteProvider = AssetPriceProvider<{ quote: TwelveDataQuoteResponse; historical: unknown }>;

export const isTwelveDataQuoteResponse = (value: unknown): value is TwelveDataQuoteResponse =>
	typeof value === "object" && value !== null;

type TwelveDataQuoteMap = Record<string, TwelveDataQuoteItem>;

export const normalizeTwelveDataQuoteResponse = (
	data: TwelveDataQuoteResponse | null,
): TwelveDataQuoteMap | null => {
	if (!data || typeof data !== "object") {
		return null;
	}

	if ("close" in data && "symbol" in data && typeof data.symbol === "string") {
		return { [data.symbol]: data as TwelveDataQuoteItem };
	}

	return data as TwelveDataQuoteMap;
};

export const getProviderSymbolForAsset = (asset: AssetEntity): string => {
	if (asset.asset_type === AssetType.crypto || asset.asset_type === AssetType.stablecoin) {
		return `${asset.symbol}/USD`;
	}
	if (asset.asset_type === AssetType.fiat) {
		return `USD/${asset.symbol}`;
	}
	return asset.symbol;
};

export function buildLivePriceCaches(
	provider: QuoteProvider,
	assets: AssetEntity[],
	data: TwelveDataQuoteResponse | null,
): AssetPriceLiveCache[] {
	const normalized = normalizeTwelveDataQuoteResponse(data);
	if (!normalized) {
		return [];
	}

	const assetMap = new Map(
		assets.map((asset) => [normalizeSymbol(getProviderSymbolForAsset(asset)), asset]),
	);

	return Object.entries(normalized).reduce<AssetPriceLiveCache[]>((acc, [key, item]) => {
		if (!item || typeof item !== "object") {
			return acc;
		}

		const rawSymbol = "symbol" in item && typeof item.symbol === "string" ? item.symbol : key;
		if (!rawSymbol) {
			return acc;
		}

		const asset = assetMap.get(normalizeSymbol(rawSymbol));
		if (!asset) {
			return acc;
		}

		const price = toNumber("close" in item ? item.close : undefined);
		if (price === undefined) {
			return acc;
		}

		const quoteCurrency = (
			("currency" in item ? item.currency : undefined) ??
			asset.quote_currency ??
			"USD"
		).toUpperCase();

		const providerUpdatedAt =
			toTimestamp("timestamp" in item ? item.timestamp : undefined) ??
			toTimestamp("datetime" in item ? item.datetime : undefined);

		acc.push({
			assetId: asset.id,
			symbol: asset.symbol,
			name: asset.name,
			quoteCurrency,
			price,
			changeAmount: toNumber("change" in item ? item.change : undefined),
			changePercent: toNumber("percent_change" in item ? item.percent_change : undefined),
			high: toNumber("high" in item ? item.high : undefined),
			low: toNumber("low" in item ? item.low : undefined),
			open: toNumber("open" in item ? item.open : undefined),
			previousClose: toNumber("previous_close" in item ? item.previous_close : undefined),
			volume: toNumber("volume" in item ? item.volume : undefined),
			isMarketOpen: "is_market_open" in item ? Boolean(item.is_market_open) : undefined,
			source: provider.name,
			providerAssetKey: rawSymbol,
			updatedAt: Date.now(),
			providerUpdatedAt,
		});

		return acc;
	}, []);
}

export function buildPriceInputs(
	provider: QuoteProvider,
	assets: AssetEntity[],
	data: TwelveDataQuoteResponse | null,
): CreateAssetPriceInput[] {
	const normalized = normalizeTwelveDataQuoteResponse(data);
	if (!normalized) {
		return [];
	}

	const assetMap = new Map(
		assets.map((asset) => [normalizeSymbol(getProviderSymbolForAsset(asset)), asset]),
	);
	const now = Date.now();
	return Object.entries(normalized).reduce<CreateAssetPriceInput[]>((acc, [key, item]) => {
		if (!item || typeof item !== "object") {
			return acc;
		}

		const rawSymbol = "symbol" in item && typeof item.symbol === "string" ? item.symbol : key;
		if (!rawSymbol) {
			return acc;
		}

		const asset = assetMap.get(normalizeSymbol(rawSymbol));
		if (!asset) {
			return acc;
		}

		const price = toNumber("close" in item ? item.close : undefined);
		if (price === undefined) {
			return acc;
		}

		const priceAt = toTimestamp("timestamp" in item ? item.timestamp : undefined)
			?? toTimestamp("datetime" in item ? item.datetime : undefined)
			?? now;
		const quoteCurrency = (
			("currency" in item ? item.currency : undefined) ??
			asset.quote_currency ??
			"USD"
		).toUpperCase();

		acc.push({
			assetId: asset.id,
			quoteCurrency,
			price,
			source: provider.name,
			priceAt,
		});

		return acc;
	}, []);
}
