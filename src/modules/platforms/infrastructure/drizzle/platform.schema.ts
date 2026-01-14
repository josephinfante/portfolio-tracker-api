import { usersTable } from "@shared/database/drizzle/schema";
import { bigint, index, pgEnum, pgTable, varchar } from "drizzle-orm/pg-core";

export const platformTypeEnum = pgEnum("platform_type", [
	"exchange",
	"bank",
	"broker",
	"wallet",
	"yield_platform",
	"payment_processor",
	"custodian",
	"fund",
	"other",
]);

export const platformsTable = pgTable(
	"platforms",
	{
		id: varchar("id", { length: 36 }).primaryKey(),
		userId: varchar("user_id", { length: 36 })
			.notNull()
			.references(() => usersTable.id, { onDelete: "cascade" }),

		name: varchar("name", { length: 100 }).notNull(),
		type: platformTypeEnum("type").notNull(),
		country: varchar("country", { length: 2 }).notNull(),

		createdAt: bigint("created_at", { mode: "number" }).notNull(),
		updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
	},
	(table) => [index("platforms_user_idx").on(table.userId)],
);
