import { pgTable, varchar, bigint, decimal, uniqueIndex } from "drizzle-orm/pg-core";

export const exchangeRatesTable = pgTable(
	"exchange_rates",
	{
		id: varchar("id", { length: 36 }).primaryKey(),

		baseCurrency: varchar("base_currency", { length: 3 }).notNull(),
		quoteCurrency: varchar("quote_currency", { length: 3 }).notNull(),

		buyRate: decimal("buy_rate", { precision: 30, scale: 10 }).notNull(),
		sellRate: decimal("sell_rate", { precision: 30, scale: 10 }).notNull(),

		source: varchar("source", { length: 30 }).notNull(),

		rateAt: bigint("rate_at", { mode: "number" }).notNull(), // cuándo se obtuvo el rate
		createdAt: bigint("created_at", { mode: "number" }).notNull(),
	},
	(table) => ({
		uniqRate: uniqueIndex("exchange_rates_unique_rate").on(
			table.baseCurrency,
			table.quoteCurrency,
			table.source,
			table.rateAt,
		),
	}),
);
