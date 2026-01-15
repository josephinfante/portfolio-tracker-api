CREATE TABLE "exchange_rates" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"base_currency" varchar(3) NOT NULL,
	"quote_currency" varchar(3) NOT NULL,
	"buy_rate" numeric(30, 10) NOT NULL,
	"sell_rate" numeric(30, 10) NOT NULL,
	"source" varchar(30) NOT NULL,
	"rate_at" bigint NOT NULL,
	"created_at" bigint NOT NULL
);
