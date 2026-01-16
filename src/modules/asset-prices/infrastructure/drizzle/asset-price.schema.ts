import { assetsTable } from "@shared/database/drizzle/schema";
import { pgTable, varchar, numeric, index, uniqueIndex, bigint } from "drizzle-orm/pg-core";

export const assetPricesTable = pgTable(
	"asset_prices",
	{
		id: varchar("id", { length: 36 }).primaryKey(),
		assetId: varchar("asset_id", { length: 36 })
			.notNull()
			.references(() => assetsTable.id, { onDelete: "cascade" }),

		quoteCurrency: varchar("quote_currency", { length: 3 }).notNull(),
		price: numeric("price", { precision: 18, scale: 8 }).notNull(),
		source: varchar("source", { length: 30 }).notNull(),

		priceAt: bigint("price_at", { mode: "number" }).notNull(),
		createdAt: bigint("created_at", { mode: "number" }).notNull(),
	},
	(table) => [
		index("asset_prices_latest_idx").on(table.assetId, table.quoteCurrency, table.priceAt),
		uniqueIndex("asset_prices_unique_asset_price_at").on(
			table.assetId,
			table.quoteCurrency,
			table.source,
			table.priceAt,
		),
	],
);
