import { AccountEntity } from "../domain/account.entity";
import { accountsTable } from "./drizzle/account.schema";

export class AccountMapper {
	static toEntity(row: typeof accountsTable.$inferSelect): AccountEntity {
		return {
			id: row.id,
			userId: row.userId,
			platformId: row.platformId,
			name: row.name,
			currencyCode: row.currencyCode,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
		};
	}

	static toEntityList(rows: (typeof accountsTable.$inferSelect)[]): AccountEntity[] {
		return rows.map((row) => this.toEntity(row));
	}

	static toEntityWithPlatform(row: {
		account: typeof accountsTable.$inferSelect;
		platform: { id: string; name: string; type: string };
	}): AccountEntity {
		return {
			...this.toEntity(row.account),
			platform: {
				id: row.platform.id,
				name: row.platform.name,
				type: row.platform.type,
			},
		};
	}

	static toEntityListWithPlatform(
		rows: {
			account: typeof accountsTable.$inferSelect;
			platform: { id: string; name: string; type: string };
		}[],
	): AccountEntity[] {
		return rows.map((row) => this.toEntityWithPlatform(row));
	}

	static toPersistence(entity: AccountEntity) {
		return {
			id: entity.id,
			userId: entity.userId,
			platformId: entity.platformId,
			name: entity.name,
			currencyCode: entity.currencyCode,
			createdAt: entity.createdAt,
			updatedAt: entity.updatedAt,
		};
	}
}
