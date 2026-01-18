import { bigint, decimal, pgTable, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { accountsTable, assetsTable, portfolioSnapshotsTable } from "@shared/database/drizzle/schema";

export const portfolioSnapshotItemsTable = pgTable(
	"portfolio_snapshot_items",
	{
		id: varchar("id", { length: 36 }).primaryKey(),
		snapshotId: varchar("snapshot_id", { length: 36 })
			.notNull()
			.references(() => portfolioSnapshotsTable.id, { onDelete: "cascade" }),
		accountId: varchar("account_id", { length: 36 })
			.notNull()
			.references(() => accountsTable.id, { onDelete: "cascade" }),
		assetId: varchar("asset_id", { length: 36 })
			.notNull()
			.references(() => assetsTable.id, { onDelete: "cascade" }),

		quantity: decimal("quantity", { precision: 30, scale: 10 }).notNull(),

		priceUsd: decimal("price_usd", { precision: 30, scale: 10 }).notNull(),
		priceBase: decimal("price_base", { precision: 30, scale: 10 }).notNull(),

		valueUsd: decimal("value_usd", { precision: 30, scale: 10 }).notNull(),
		valueBase: decimal("value_base", { precision: 30, scale: 10 }).notNull(),

		createdAt: bigint("created_at", { mode: "number" }).notNull(),
	},
	(table) => [uniqueIndex("portfolio_snapshot_items_uniq").on(table.snapshotId, table.accountId, table.assetId)],
);
