import { inject, injectable } from "tsyringe";
import { ExchangeRateRepository } from "../domain/exchange-rate.repository";
import { TOKENS } from "@shared/container/tokens";
import { Drizzle } from "@shared/database/drizzle/client";
import { exchangeRatesTable } from "./drizzle/exchange-rate.schema";
import { and, eq, gte, lte, SQL, sql } from "drizzle-orm";
import { ExchangeRateMapper } from "./exchange-rate.mappers";
import {
	CreateExchangeRateInput,
	FindExchangeRatesOptions,
	FindExchangeRatesResponse,
} from "../domain/exchange-rate.types";
import { v4 as uuidv4 } from "uuid";

@injectable()
export class ExchangeRateSqlRepository implements ExchangeRateRepository {
	constructor(@inject(TOKENS.Drizzle) private readonly db: Drizzle) {}

	private now(): number {
		return Date.now();
	}

	private normalizeCurrencyCode(value?: string) {
		const trimmed = value?.trim().toUpperCase();
		return trimmed && trimmed.length >= 3 ? trimmed : undefined;
	}

	private buildWhere(options?: FindExchangeRatesOptions) {
		const conditions: SQL[] = [];

		const baseCurrency = this.normalizeCurrencyCode(options?.baseCurrency);
		if (baseCurrency) {
			conditions.push(eq(exchangeRatesTable.baseCurrency, baseCurrency));
		}

		const quoteCurrency = this.normalizeCurrencyCode(options?.quoteCurrency);
		if (quoteCurrency) {
			conditions.push(eq(exchangeRatesTable.quoteCurrency, quoteCurrency));
		}

		if (options?.source?.trim()) {
			conditions.push(eq(exchangeRatesTable.source, options.source.trim()));
		}

		if (options?.startRateAt !== undefined) {
			conditions.push(gte(exchangeRatesTable.rateAt, options.startRateAt));
		}

		if (options?.endRateAt !== undefined) {
			conditions.push(lte(exchangeRatesTable.rateAt, options.endRateAt));
		}

		const where = conditions.length ? and(...conditions) : undefined;
		return { where };
	}

	async upsert(exchangeRate: CreateExchangeRateInput): Promise<void> {
		const now = this.now();

		await this.db
			.insert(exchangeRatesTable)
			.values({
				id: uuidv4(),
				baseCurrency: exchangeRate.baseCurrency,
				quoteCurrency: exchangeRate.quoteCurrency,
				buyRate: exchangeRate.buyRate.toString(),
				sellRate: exchangeRate.sellRate.toString(),
				source: exchangeRate.source,
				rateAt: exchangeRate.rateAt,
				createdAt: now,
			})
			.onConflictDoUpdate({
				target: [
					exchangeRatesTable.baseCurrency,
					exchangeRatesTable.quoteCurrency,
					exchangeRatesTable.source,
					exchangeRatesTable.rateAt,
				],
				set: {
					buyRate: exchangeRate.buyRate.toString(),
					sellRate: exchangeRate.sellRate.toString(),
				},
			});
	}

	async findAll(options?: FindExchangeRatesOptions): Promise<FindExchangeRatesResponse> {
		const { where } = this.buildWhere(options);

		const countQuery = this.db.select({ count: sql<number>`count(*)` }).from(exchangeRatesTable);
		const dataQuery = this.db.select().from(exchangeRatesTable);

		if (where) {
			countQuery.where(where);
			dataQuery.where(where);
		}

		const [{ count }] = await countQuery;

		const rows = await dataQuery.orderBy(
			exchangeRatesTable.baseCurrency,
			exchangeRatesTable.quoteCurrency,
			exchangeRatesTable.rateAt,
		);

		const items = ExchangeRateMapper.toEntityList(rows).map((row) => ({
			baseCurrency: row.baseCurrency,
			quoteCurrency: row.quoteCurrency,
			rates: [
				{
					buyRate: row.buyRate,
					sellRate: row.sellRate,
					source: row.source,
					rateAt: row.rateAt,
				},
			],
		}));

		return {
			items,
			totalCount: Number(count ?? 0),
		};
	}
}
