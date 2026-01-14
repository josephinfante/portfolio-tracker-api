import { PlatformEntity } from "../domain/platform.entity";
import { platformsTable } from "./drizzle/platform.schema";

export class PlatformMapper {
	static toEntity(row: typeof platformsTable.$inferSelect): PlatformEntity {
		return {
			id: row.id,
			userId: row.userId,
			name: row.name,
			type: row.type as PlatformEntity["type"],
			country: row.country,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
		};
	}

	static toEntityList(rows: (typeof platformsTable.$inferSelect)[]): PlatformEntity[] {
		return rows.map((row) => this.toEntity(row));
	}

	static toPersistence(entity: PlatformEntity) {
		return {
			id: entity.id,
			userId: entity.userId,
			name: entity.name,
			type: entity.type,
			country: entity.country,
			createdAt: entity.createdAt,
			updatedAt: entity.updatedAt,
		};
	}
}
