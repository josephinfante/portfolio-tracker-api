import { platformsTable, usersTable } from "@shared/database/drizzle/schema";
import { bigint, index, pgTable, varchar } from "drizzle-orm/pg-core";

export const accountsTable = pgTable(
	"accounts",
	{
		id: varchar("id", { length: 36 }).primaryKey(),
		userId: varchar("user_id", { length: 36 })
			.notNull()
			.references(() => usersTable.id, { onDelete: "cascade" }),
		platformId: varchar("platform_id", { length: 36 })
			.notNull()
			.references(() => platformsTable.id, { onDelete: "cascade" }),

		name: varchar("name", { length: 100 }).notNull(),
		currencyCode: varchar("currency_code", { length: 3 }).notNull(),

		createdAt: bigint("created_at", { mode: "number" }).notNull(),
		updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
	},
	(table) => [index("accounts_user_idx").on(table.userId), index("accounts_platform_idx").on(table.platformId)],
);
