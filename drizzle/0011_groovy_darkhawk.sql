CREATE TABLE "portfolio_snapshot" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"snapshot_date" date NOT NULL,
	"fx_usd_to_base" numeric(30, 10) NOT NULL,
	"total_value_usd" numeric(30, 10) NOT NULL,
	"total_value_base" numeric(30, 10) NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio_snapshot_items" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"snapshot_id" varchar(36) NOT NULL,
	"account_id" varchar(36) NOT NULL,
	"asset_id" varchar(36) NOT NULL,
	"quantity" numeric(30, 10) NOT NULL,
	"price_usd" numeric(30, 10) NOT NULL,
	"price_base" numeric(30, 10) NOT NULL,
	"value_usd" numeric(30, 10) NOT NULL,
	"value_base" numeric(30, 10) NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "portfolio_snapshot" ADD CONSTRAINT "portfolio_snapshot_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_snapshot_items" ADD CONSTRAINT "portfolio_snapshot_items_snapshot_id_portfolio_snapshot_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."portfolio_snapshot"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_snapshot_items" ADD CONSTRAINT "portfolio_snapshot_items_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_snapshot_items" ADD CONSTRAINT "portfolio_snapshot_items_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "portfolio_snapshots_user_date_uniq" ON "portfolio_snapshot" USING btree ("user_id","snapshot_date");--> statement-breakpoint
CREATE UNIQUE INDEX "portfolio_snapshot_items_uniq" ON "portfolio_snapshot_items" USING btree ("snapshot_id","account_id","asset_id");