import { AssetPriceEntity } from "@modules/asset-prices/domain/asset-price.entity";
import { assetPricesTable } from "./drizzle/asset-price.schema";

const toNumber = (value: unknown): number => {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}
	if (typeof value === "string" && value.length) {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : 0;
	}
	return 0;
};

const toTimestamp = (value: unknown): number => {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}
	if (value instanceof Date) {
		return value.getTime();
	}
	if (typeof value === "string" && value.length) {
		const parsed = Date.parse(value);
		return Number.isFinite(parsed) ? parsed : 0;
	}
	return 0;
};

export class AssetPriceMapper {
	static toEntity(row: typeof assetPricesTable.$inferSelect): AssetPriceEntity {
		return {
			id: row.id,
			assetId: row.assetId,
			quoteCurrency: row.quoteCurrency,
			price: toNumber(row.price).toString(),
			source: row.source,
			priceAt: toTimestamp(row.priceAt),
			createdAt: toTimestamp(row.createdAt),
		};
	}

	static toEntityList(rows: (typeof assetPricesTable.$inferSelect)[]): AssetPriceEntity[] {
		return rows.map((row) => this.toEntity(row));
	}
}
