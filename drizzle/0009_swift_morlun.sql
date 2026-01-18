ALTER TABLE "asset_prices" ALTER COLUMN "created_at" DROP DEFAULT;
--> statement-breakpoint

ALTER TABLE "asset_prices"
ALTER COLUMN "created_at" TYPE bigint
USING (EXTRACT(EPOCH FROM "created_at") * 1000)::bigint;
--> statement-breakpoint

ALTER TABLE "asset_prices"
ALTER COLUMN "price_at" TYPE bigint
USING (EXTRACT(EPOCH FROM "price_at") * 1000)::bigint;
