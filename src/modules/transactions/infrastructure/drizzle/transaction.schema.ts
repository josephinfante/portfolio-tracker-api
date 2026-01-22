import { accountsTable, assetsTable, usersTable } from "@shared/database/drizzle/schema";
import { relations } from "drizzle-orm";
import { bigint, decimal, index, pgTable, varchar } from "drizzle-orm/pg-core";

export const transactionsTable = pgTable(
	"transactions",
	{
		id: varchar("id", { length: 36 }).primaryKey(),

		userId: varchar("user_id", { length: 36 })
			.notNull()
			.references(() => usersTable.id, { onDelete: "cascade" }),

		accountId: varchar("account_id", { length: 36 })
			.notNull()
			.references(() => accountsTable.id, { onDelete: "cascade" }),

		assetId: varchar("asset_id", { length: 36 })
			.notNull()
			.references(() => assetsTable.id, { onDelete: "cascade" }),

		transactionType: varchar("transaction_type", { length: 100 }).notNull(),
		correctionType: varchar("correction_type", { length: 100 }),

		referenceTxId: varchar("reference_tx_id", { length: 36 }),

		quantity: decimal("quantity", { precision: 30, scale: 10 }).notNull(),
		totalAmount: decimal("total_amount", { precision: 30, scale: 10 }).notNull(),
		paymentAssetId: varchar("payment_asset_id", { length: 36 })
			.notNull()
			.references(() => assetsTable.id, { onDelete: "cascade" }),
		paymentQuantity: decimal("payment_quantity", { precision: 30, scale: 10 }).notNull(),
		exchangeRate: decimal("exchange_rate", { precision: 30, scale: 10 }),

		transactionDate: bigint("transaction_date", { mode: "number" }).notNull(),
		notes: varchar("notes", { length: 5000 }),

		createdAt: bigint("created_at", { mode: "number" }).notNull(),
	},
	(table) => [
		index("transactions_user_idx").on(table.userId),
		index("transactions_account_idx").on(table.accountId),
		index("transactions_reference_idx").on(table.referenceTxId),
		index("transactions_account_date_idx").on(table.accountId, table.transactionDate),
	],
);

export const transactionsRelations = relations(transactionsTable, ({ one }) => ({
	referenceTransaction: one(transactionsTable, {
		fields: [transactionsTable.referenceTxId],
		references: [transactionsTable.id],
	}),
}));
