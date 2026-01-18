CREATE TABLE "assets" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"symbol" varchar(100) NOT NULL,
	"name" varchar(100) NOT NULL,
	"asset_type" varchar(100) NOT NULL,
	"pricing_source" varchar(100),
	"external_id" varchar(100),
	"quote_currency" varchar(100),
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assets_user_idx" ON "assets" USING btree ("user_id");