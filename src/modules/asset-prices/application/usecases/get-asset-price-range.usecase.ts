import { AssetRepository } from "@modules/assets/domain/asset.repository";
import { AssetEntity } from "@modules/assets/domain/asset.entity";
import { AssetType } from "@modules/assets/domain/asset.types";
import { AssetPriceRepository } from "@modules/asset-prices/domain/asset-price.repository";
import { AssetPriceRangeResponse } from "@modules/asset-prices/domain/asset-price.types";
import { UpsertAssetPriceUseCase } from "@modules/asset-prices/application/usecases/upsert-asset-price.usecase";
import { TwelvedataProvider } from "@modules/asset-prices/infrastructure/providers/twelvedata.provider";
import { getProviderSymbolForAsset } from "@modules/asset-prices/infrastructure/providers/asset-price.provider";
import { TOKENS } from "@shared/container/tokens";
import { NotFoundError } from "@shared/errors/domain/not-found.error";
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

const startOfDay = (value: number) => {
	const date = new Date(value);
	date.setUTCHours(0, 0, 0, 0);
	return date.getTime();
};

const endOfDay = (value: number) => {
	const date = new Date(value);
	date.setUTCHours(23, 59, 59, 999);
	return date.getTime();
};

const dayKey = (value: number) => startOfDay(value);

const allowedTypes = new Set([AssetType.crypto, AssetType.stablecoin, AssetType.fiat, AssetType.stock, AssetType.etf]);

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

@injectable()
export class GetAssetPriceRangeUseCase {
	private priceProvider = new TwelvedataProvider();

	constructor(
		@inject(TOKENS.AssetRepository) private assetRepository: AssetRepository,
		@inject(TOKENS.AssetPriceRepository) private assetPriceRepository: AssetPriceRepository,
		private upsertAssetPriceUseCase: UpsertAssetPriceUseCase,
	) {}

	private async resolveAsset(query: string): Promise<AssetEntity> {
		const normalized = query.trim();
		if (!normalized) {
			throw new ValidationError("Invalid asset query", "asset");
		}

		const uuidMatch = /^[0-9a-fA-F-]{36}$/.test(normalized);
		if (uuidMatch) {
			const asset = await this.assetRepository.findById(normalized);
			if (asset) {
				return asset;
			}
		}

		const { items } = await this.assetRepository.findAll({ search: normalized });
		if (!items.length) {
			throw new NotFoundError(`Asset ${normalized} not found`);
		}

		const lowered = normalized.toLowerCase();
		const exact = items.find((asset) => asset.symbol.toLowerCase() === lowered || asset.name.toLowerCase() === lowered);

		return exact ?? items[0];
	}

	private normalizeRange(startAt?: number, endAt?: number) {
		const now = Date.now();
		let start = startAt;
		let end = endAt;

		if (start !== undefined) {
			start = startOfDay(start);
		}

		if (end === undefined) {
			if (start !== undefined) {
				end = Math.min(endOfDay(start), now);
			} else {
				end = now;
			}
		} else if (end > now) {
			throw new ValidationError("Dates cannot be in the future", "endAt");
		}

		if (start === undefined || end === undefined) {
			throw new ValidationError("Invalid date range", "startAt");
		}

		if (start > end) {
			throw new ValidationError("startAt cannot be greater than endAt", "startAt");
		}
		return { start, end };
	}

	async execute(assetQuery: string, startAt?: number, endAt?: number): Promise<AssetPriceRangeResponse> {
		const asset = await this.resolveAsset(assetQuery);
		if (!allowedTypes.has(asset.asset_type)) {
			throw new ValidationError("Asset type not supported for price range", "assetType");
		}

		const range = this.normalizeRange(parseNumber(startAt), parseNumber(endAt));

		const existing = await this.assetPriceRepository.findAll({
			assets: [asset.id],
			startAt: range.start,
			endAt: range.end,
		});

		const existingPrices = existing.items.flatMap((item) => item.prices);
		const expectedDays = new Set<number>();
		for (let cursor = dayKey(range.start); cursor <= dayKey(range.end); cursor += 86_400_000) {
			expectedDays.add(cursor);
		}

		const presentDays = new Set<number>();
		existingPrices.forEach((price) => {
			presentDays.add(dayKey(price.priceAt));
		});

		const missingDays = [...expectedDays].filter((day) => !presentDays.has(day));

		if (!existingPrices.length || missingDays.length) {
			const symbol = getProviderSymbolForAsset(asset);
			const historical = await this.priceProvider.getHistorical(symbol, range.start, range.end);
			if (historical?.values?.length) {
				const quoteCurrency = "USD";
				const inputs = historical.values
					.map((value) => {
						const price = toNumber(value.close);
						const priceAt = toTimestamp(value.datetime);
						if (price === undefined || priceAt === undefined) {
							return null;
						}
						return {
							assetId: asset.id,
							quoteCurrency: quoteCurrency.toUpperCase(),
							price,
							source: this.priceProvider.name,
							priceAt,
						};
					})
					.filter((value): value is NonNullable<typeof value> => value !== null);

				if (inputs.length) {
					await this.upsertAssetPriceUseCase.execute(inputs);
				}
			}
		}

		const response = await this.assetPriceRepository.findAll({
			assets: [asset.id],
			startAt: range.start,
			endAt: range.end,
		});

		const prices = response.items.flatMap((item) => item.prices).sort((a, b) => a.priceAt - b.priceAt);

		const grouped = new Map<number, { price: number; source: string; priceAt: number }>();
		prices.forEach((price) => {
			const key = dayKey(price.priceAt);
			const existing = grouped.get(key);
			if (!existing || price.priceAt > existing.priceAt) {
				grouped.set(key, price);
			}
		});

		const items = Array.from(grouped.entries())
			.sort(([a], [b]) => a - b)
			.map(([, price]) => ({
				price: price.price,
				source: price.source,
				priceAt: price.priceAt,
			}));

		return {
			items,
			totalCount: items.length,
		};
	}
}
