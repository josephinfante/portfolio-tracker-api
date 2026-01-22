ALTER TABLE "transactions" ADD COLUMN "payment_asset_id" varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "payment_quantity" numeric(30, 10) NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_payment_asset_id_assets_id_fk" FOREIGN KEY ("payment_asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" DROP COLUMN "unit_price";--> statement-breakpoint
ALTER TABLE "transactions" DROP COLUMN "currency_code";