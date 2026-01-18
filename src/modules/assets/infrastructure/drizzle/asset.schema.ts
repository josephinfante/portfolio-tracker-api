import { bigint, pgTable, varchar } from "drizzle-orm/pg-core";

export const assetsTable = pgTable("assets", {
	id: varchar("id", { length: 36 }).primaryKey(),
	symbol: varchar("symbol", { length: 100 }).notNull(),
	name: varchar("name", { length: 100 }).notNull(),
	asset_type: varchar("asset_type", { length: 100 }).notNull(),

	pricing_source: varchar("pricing_source", { length: 100 }),
	external_id: varchar("external_id", { length: 100 }),
	quote_currency: varchar("quote_currency", { length: 100 }),

	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});
