import { usersTable } from "@shared/database/drizzle/schema";
import { bigint, date, decimal, pgTable, uniqueIndex, varchar } from "drizzle-orm/pg-core";

export const portfolioSnapshotsTable = pgTable(
	"portfolio_snapshot",
	{
		id: varchar("id", { length: 36 }).primaryKey(),
		userId: varchar("user_id", { length: 36 })
			.notNull()
			.references(() => usersTable.id, { onDelete: "cascade" }),

		snapshotDate: date("snapshot_date").notNull(),
		fxUsdToBase: decimal("fx_usd_to_base", { precision: 30, scale: 10 }).notNull(),

		totalValueUsd: decimal("total_value_usd", { precision: 30, scale: 10 }).notNull(),
		totalValueBase: decimal("total_value_base", { precision: 30, scale: 10 }).notNull(),

		createdAt: bigint("created_at", { mode: "number" }).notNull(),
		updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
	},
	(table) => [uniqueIndex("portfolio_snapshots_user_date_uniq").on(table.userId, table.snapshotDate)],
);
