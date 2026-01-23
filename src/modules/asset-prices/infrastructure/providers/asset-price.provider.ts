import { AssetEntity } from "@modules/assets/domain/asset.entity";
import { AssetType } from "@modules/assets/domain/asset.types";
import { AssetPriceRepository } from "@modules/asset-prices/domain/asset-price.repository";
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

const inferQuoteCurrency = (asset: AssetEntity): string | undefined => {
	if (asset.asset_type === AssetType.fiat) {
		const symbol = asset.symbol?.trim().toUpperCase();
		return symbol && symbol.length ? symbol : undefined;
	}

	const quoteCurrency = asset.quote_currency?.trim().toUpperCase();
	return quoteCurrency && quoteCurrency.length ? quoteCurrency : "USD";
};

const buildCachedQuoteItem = (
	symbol: string,
	asset: AssetEntity,
	price: { price: number; priceAt: number; quoteCurrency: string },
): TwelveDataQuoteItem => {
	const timestamp = price.priceAt;
	const priceValue = price.price.toString();
	const datetime = new Date(timestamp).toISOString();

	return {
		symbol,
		name: asset.name ?? asset.symbol,
		exchange: "",
		mic_code: "",
		currency: price.quoteCurrency,
		datetime,
		timestamp,
		last_quote_at: timestamp,
		open: priceValue,
		high: priceValue,
		low: priceValue,
		close: priceValue,
		volume: "0",
		previous_close: priceValue,
		change: "0",
		percent_change: "0",
		average_volume: "0",
		is_market_open: false,
		fifty_two_week: {
			low: "0",
			high: "0",
			low_change: "0",
			high_change: "0",
			low_change_percent: "0",
			high_change_percent: "0",
			range: "0",
		},
	};
};

export async function requestProviderQuotesWithCache(
	provider: QuoteProvider,
	assets: AssetEntity[],
	assetPriceRepository: AssetPriceRepository,
	symbols: string[],
	options?: {
		maxAgeMs?: number;
		persist?: boolean;
	},
): Promise<TwelveDataQuoteResponse | null> {
	if (!symbols.length) {
		return null;
	}

	if (!assets.length) {
		return provider.getQuote(symbols);
	}

	const maxAgeMs = options?.maxAgeMs ?? 30 * 60 * 1000;
	const persist = options?.persist ?? true;

	const now = Date.now();
	const cutoff = now - maxAgeMs;

	const assetMap = new Map<string, AssetEntity>();
	const assetIds: string[] = [];
	const quoteCurrencies = new Set<string>();
	const assetQuoteById = new Map<string, string>();

	for (const asset of assets) {
		assetIds.push(asset.id);
		assetMap.set(normalizeSymbol(getProviderSymbolForAsset(asset)), asset);
		const quoteCurrency = inferQuoteCurrency(asset);
		if (quoteCurrency) {
			assetQuoteById.set(asset.id, quoteCurrency);
			quoteCurrencies.add(quoteCurrency);
		}
	}

	let cachedQuoteMap: Record<string, TwelveDataQuoteItem> = {};
	if (assetIds.length && quoteCurrencies.size) {
		const cached = await assetPriceRepository.findAll({
			assets: assetIds,
			quoteCurrencies: Array.from(quoteCurrencies),
			startAt: cutoff,
		});

		const latestByKey = new Map<string, { price: number; priceAt: number; quoteCurrency: string }>();
		for (const item of cached.items) {
			const priceEntry = item.prices[0];
			if (!priceEntry) {
				continue;
			}
			const key = `${item.asset.id}:${item.quoteCurrency}`;
			const existing = latestByKey.get(key);
			if (!existing || priceEntry.priceAt > existing.priceAt) {
				latestByKey.set(key, {
					price: priceEntry.price,
					priceAt: priceEntry.priceAt,
					quoteCurrency: item.quoteCurrency,
				});
			}
		}

		cachedQuoteMap = symbols.reduce<Record<string, TwelveDataQuoteItem>>((acc, symbol) => {
			const asset = assetMap.get(normalizeSymbol(symbol));
			if (!asset) {
				return acc;
			}
			const quoteCurrency = assetQuoteById.get(asset.id);
			if (!quoteCurrency) {
				return acc;
			}
			const cachedEntry = latestByKey.get(`${asset.id}:${quoteCurrency}`);
			if (!cachedEntry) {
				return acc;
			}
			acc[symbol] = buildCachedQuoteItem(symbol, asset, cachedEntry);
			return acc;
		}, {});
	}

	const missingSymbols = symbols.filter((symbol) => !cachedQuoteMap[symbol]);

	let providerMap: Record<string, TwelveDataQuoteItem> = {};
	if (missingSymbols.length) {
		const providerData = await provider.getQuote(missingSymbols);
		const normalized = normalizeTwelveDataQuoteResponse(providerData);
		if (normalized) {
			providerMap = normalized;
			const inputs = buildPriceInputs(provider, assets, normalized);
			if (persist && inputs.length) {
				await assetPriceRepository.upsertMany(inputs);
			}
		}
	}

	const merged = { ...providerMap, ...cachedQuoteMap };
	return Object.keys(merged).length ? merged : null;
}

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
