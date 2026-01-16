import { AssetPriceRepository } from "@modules/asset-prices/domain/asset-price.repository";
import {
	CreateAssetPriceInput,
	FindAssetPriceOptions,
	FindAssetPricesResponse,
} from "@modules/asset-prices/domain/asset-price.types";
import { AssetPriceMapper } from "@modules/asset-prices/infrastructure/asset-price.mappers";
import { assetPricesTable } from "@modules/asset-prices/infrastructure/drizzle/asset-price.schema";
import { TOKENS } from "@shared/container/tokens";
import { Drizzle } from "@shared/database/drizzle/client";
import { assetsTable } from "@shared/database/drizzle/schema";
import { and, eq, gte, inArray, lte, SQL, sql } from "drizzle-orm";
import { inject, injectable } from "tsyringe";
import { v4 as uuidv4 } from "uuid";

@injectable()
export class AssetPriceSqlRepository implements AssetPriceRepository {
	constructor(@inject(TOKENS.Drizzle) private readonly db: Drizzle) {}

	private now(): number {
		return Date.now();
	}

	private normalizeCurrency(value?: string) {
		const trimmed = value?.trim().toUpperCase();
		return trimmed && trimmed.length >= 3 ? trimmed : undefined;
	}

	private buildWhere(options?: FindAssetPriceOptions) {
		const conditions: SQL[] = [];

		if (options?.assets?.length) {
			conditions.push(inArray(assetPricesTable.assetId, options.assets));
		}

		if (options?.quoteCurrencies?.length) {
			const normalized = options.quoteCurrencies
				.map((currency) => this.normalizeCurrency(currency))
				.filter((currency): currency is string => !!currency);
			if (normalized.length) {
				conditions.push(inArray(assetPricesTable.quoteCurrency, normalized));
			}
		}

		if (options?.sources?.length) {
			const sources = options.sources.map((source) => source.trim()).filter((source) => source.length > 0);
			if (sources.length) {
				conditions.push(inArray(assetPricesTable.source, sources));
			}
		}

		if (options?.startAt !== undefined) {
			conditions.push(gte(assetPricesTable.priceAt, options.startAt));
		}

		if (options?.endAt !== undefined) {
			conditions.push(lte(assetPricesTable.priceAt, options.endAt));
		}

		const where = conditions.length ? and(...conditions) : undefined;
		return { where };
	}

	async upsertMany(assetPrices: CreateAssetPriceInput[]): Promise<void> {
		if (!assetPrices.length) {
			return;
		}

		const now = this.now();
		const rows = assetPrices.map((assetPrice) => ({
			id: uuidv4(),
			assetId: assetPrice.assetId,
			quoteCurrency: this.normalizeCurrency(assetPrice.quoteCurrency) ?? assetPrice.quoteCurrency,
			price: assetPrice.price.toString(),
			source: assetPrice.source,
			priceAt: assetPrice.priceAt,
			createdAt: now,
		}));
		console.log(rows);
		await this.db
			.insert(assetPricesTable)
			.values(rows)
			.onConflictDoNothing({
				target: [
					assetPricesTable.assetId,
					assetPricesTable.quoteCurrency,
					assetPricesTable.source,
					assetPricesTable.priceAt,
				],
			});
	}

	async findAll(options?: FindAssetPriceOptions): Promise<FindAssetPricesResponse> {
		const { where } = this.buildWhere(options);

		const countQuery = this.db.select({ count: sql<number>`count(*)` }).from(assetPricesTable);
		const dataQuery = this.db
			.select({
				id: assetPricesTable.id,
				assetId: assetPricesTable.assetId,
				quoteCurrency: assetPricesTable.quoteCurrency,
				price: assetPricesTable.price,
				source: assetPricesTable.source,
				priceAt: assetPricesTable.priceAt,
				createdAt: assetPricesTable.createdAt,
				assetName: assetsTable.name,
				assetSymbol: assetsTable.symbol,
			})
			.from(assetPricesTable)
			.innerJoin(assetsTable, eq(assetPricesTable.assetId, assetsTable.id));

		if (where) {
			countQuery.where(where);
			dataQuery.where(where);
		}

		const [{ count }] = await countQuery;

		const rows = await dataQuery.orderBy(assetsTable.symbol, assetPricesTable.quoteCurrency, assetPricesTable.priceAt);

		const items = rows.map((row) => {
			const entity = AssetPriceMapper.toEntity({
				id: row.id,
				assetId: row.assetId,
				quoteCurrency: row.quoteCurrency,
				price: row.price,
				source: row.source,
				priceAt: row.priceAt,
				createdAt: row.createdAt,
			});

			return {
				asset: {
					id: row.assetId,
					name: row.assetName,
					symbol: row.assetSymbol,
				},
				quoteCurrency: entity.quoteCurrency,
				prices: [
					{
						price: Number(entity.price),
						source: entity.source,
						priceAt: entity.priceAt,
					},
				],
			};
		});

		return {
			items,
			totalCount: Number(count ?? 0),
		};
	}
}
