import { ExchangeRateEntity } from "../domain/exchange-rate.entity";
import { exchangeRatesTable } from "./drizzle/exchange-rate.schema";

const toNumber = (value: unknown): number => {
	if (typeof value === "number") {
		return value;
	}
	if (typeof value === "string" && value.length) {
		return Number(value);
	}
	return 0;
};

export class ExchangeRateMapper {
	static toEntity(row: typeof exchangeRatesTable.$inferSelect): ExchangeRateEntity {
		return {
			id: row.id,
			baseCurrency: row.baseCurrency,
			quoteCurrency: row.quoteCurrency,
			buyRate: toNumber(row.buyRate),
			sellRate: toNumber(row.sellRate),
			source: row.source,
			rateAt: row.rateAt,
			createdAt: row.createdAt,
		};
	}

	static toEntityList(rows: (typeof exchangeRatesTable.$inferSelect)[]): ExchangeRateEntity[] {
		return rows.map((row) => this.toEntity(row));
	}
}
