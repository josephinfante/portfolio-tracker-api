CREATE TABLE "asset_prices" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"asset_id" varchar(36) NOT NULL,
	"quote_currency" varchar(3) NOT NULL,
	"price" numeric(18, 8) NOT NULL,
	"source" varchar(30) NOT NULL,
	"price_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assets" DROP CONSTRAINT "assets_user_id_users_id_fk";
--> statement-breakpoint
DROP INDEX "assets_user_idx";--> statement-breakpoint
ALTER TABLE "asset_prices" ADD CONSTRAINT "asset_prices_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "asset_prices_latest_idx" ON "asset_prices" USING btree ("asset_id","quote_currency","price_at");--> statement-breakpoint
CREATE UNIQUE INDEX "asset_prices_unique_asset_price_at" ON "asset_prices" USING btree ("asset_id","quote_currency","source","price_at");--> statement-breakpoint
ALTER TABLE "assets" DROP COLUMN "user_id";