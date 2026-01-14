CREATE TYPE "public"."platform_type" AS ENUM('exchange', 'bank', 'broker', 'wallet', 'yield_platform', 'payment_processor', 'custodian', 'fund', 'other');--> statement-breakpoint
CREATE TABLE "platforms" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"name" varchar(100) NOT NULL,
	"type" "platform_type" NOT NULL,
	"country" varchar(2) NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "platforms" ADD CONSTRAINT "platforms_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "platforms_user_idx" ON "platforms" USING btree ("user_id");