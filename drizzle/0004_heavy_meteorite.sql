CREATE TABLE "transactions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"account_id" varchar(36) NOT NULL,
	"asset_id" varchar(36) NOT NULL,
	"transaction_type" varchar(100) NOT NULL,
	"correction_type" varchar(100),
	"reference_tx_id" varchar(36),
	"quantity" numeric(30, 10) NOT NULL,
	"unit_price" numeric(30, 10),
	"total_amount" numeric(30, 10) NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"exchange_rate" numeric(30, 10),
	"transaction_date" bigint NOT NULL,
	"notes" varchar(5000),
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transactions_user_idx" ON "transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "transactions_account_idx" ON "transactions" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "transactions_reference_idx" ON "transactions" USING btree ("reference_tx_id");--> statement-breakpoint
CREATE INDEX "transactions_account_date_idx" ON "transactions" USING btree ("account_id","transaction_date");