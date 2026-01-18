import { AssetEntity } from "../domain/asset.entity";
import { assetsTable } from "./drizzle/asset.schema";

export class AssetMapper {
	static toEntity(row: typeof assetsTable.$inferSelect): AssetEntity {
		return {
			id: row.id,
			symbol: row.symbol,
			name: row.name,
			asset_type: row.asset_type as AssetEntity["asset_type"],
			pricing_source: row.pricing_source,
			external_id: row.external_id,
			quote_currency: row.quote_currency,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
		};
	}

	static toEntityList(rows: (typeof assetsTable.$inferSelect)[]): AssetEntity[] {
		return rows.map((row) => this.toEntity(row));
	}

	static toPersistence(entity: AssetEntity) {
		return {
			id: entity.id,
			symbol: entity.symbol,
			name: entity.name,
			asset_type: entity.asset_type,
			pricing_source: entity.pricing_source,
			external_id: entity.external_id,
			quote_currency: entity.quote_currency,
			createdAt: entity.createdAt,
			updatedAt: entity.updatedAt,
		};
	}
}
