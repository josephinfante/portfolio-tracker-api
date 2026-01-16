import { inject, injectable } from "tsyringe";
import { v4 as uuidv4 } from "uuid";
import { Drizzle } from "@shared/database/drizzle/client";
import type { NodePgTransaction } from "drizzle-orm/node-postgres";
import { and, asc, desc, eq, gte, lte, sql, SQL } from "drizzle-orm";
import { TOKENS } from "@shared/container/tokens";
import {
	accountsTable,
	assetsTable,
	platformsTable,
	portfolioSnapshotItemsTable,
	portfolioSnapshotsTable,
} from "@shared/database/drizzle/schema";
import { PorfolioSnapshot } from "../domain/portfolio-snapshot.entity";
import {
	CreatePortfolioSnapshotInput,
	CreatePortfolioSnapshotItemInput,
	PortfolioSnapshotRepository,
	SnapshotItemDetail,
	UpdatePortfolioSnapshotInput,
} from "../domain/portfolio-snapshot.repository";
import { NotFoundError } from "@shared/errors/domain/not-found.error";
import { SnapshotListFilters } from "../domain/portfolio-snapshot.types";

const toNumber = (value: unknown): number => {
	if (typeof value === "number") {
		return value;
	}
	if (typeof value === "string" && value.length) {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : 0;
	}
	return 0;
};

@injectable()
export class PortfolioSnapshotSqlRepository implements PortfolioSnapshotRepository {
	constructor(@inject(TOKENS.Drizzle) private readonly db: Drizzle) {}

	private now(): number {
		return Date.now();
	}

	private mapSnapshot(row: typeof portfolioSnapshotsTable.$inferSelect): PorfolioSnapshot {
		return {
			id: row.id,
			userId: row.userId,
			snapshotDate: row.snapshotDate,
			fxUsdToBase: toNumber(row.fxUsdToBase),
			totalValueUsd: toNumber(row.totalValueUsd),
			totalValueBase: toNumber(row.totalValueBase),
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
		};
	}

	private buildWhere(userId: string, options?: SnapshotListFilters) {
		const conditions: SQL[] = [eq(portfolioSnapshotsTable.userId, userId)];

		const toDateString = (value: number) => new Date(value).toISOString().slice(0, 10);

		if (options?.startDate !== undefined) {
			conditions.push(gte(portfolioSnapshotsTable.snapshotDate, toDateString(options.startDate)));
		}

		if (options?.endDate !== undefined) {
			conditions.push(lte(portfolioSnapshotsTable.snapshotDate, toDateString(options.endDate)));
		}

		const where = and(...conditions);
		return { where };
	}

	async findByUserAndDate(
		userId: string,
		snapshotDate: string,
		dbOverride?: Drizzle | NodePgTransaction<any, any>,
	): Promise<PorfolioSnapshot | null> {
		const db = dbOverride ?? this.db;
		const rows = await db
			.select()
			.from(portfolioSnapshotsTable)
			.where(and(eq(portfolioSnapshotsTable.userId, userId), eq(portfolioSnapshotsTable.snapshotDate, snapshotDate)))
			.limit(1);

		return rows[0] ? this.mapSnapshot(rows[0]) : null;
	}

	async createSnapshot(
		input: CreatePortfolioSnapshotInput,
		dbOverride?: Drizzle | NodePgTransaction<any, any>,
	): Promise<PorfolioSnapshot> {
		const db = dbOverride ?? this.db;
		const now = this.now();

		const [row] = await db
			.insert(portfolioSnapshotsTable)
			.values({
				id: uuidv4(),
				userId: input.userId,
				snapshotDate: input.snapshotDate,
				fxUsdToBase: input.fxUsdToBase,
				totalValueUsd: input.totalValueUsd,
				totalValueBase: input.totalValueBase,
				createdAt: now,
				updatedAt: now,
			})
			.returning();

		return this.mapSnapshot(row);
	}

	async updateSnapshot(
		id: string,
		input: UpdatePortfolioSnapshotInput,
		dbOverride?: Drizzle | NodePgTransaction<any, any>,
	): Promise<PorfolioSnapshot> {
		const db = dbOverride ?? this.db;
		const now = this.now();

		const [row] = await db
			.update(portfolioSnapshotsTable)
			.set({
				fxUsdToBase: input.fxUsdToBase,
				totalValueUsd: input.totalValueUsd,
				totalValueBase: input.totalValueBase,
				updatedAt: now,
			})
			.where(eq(portfolioSnapshotsTable.id, id))
			.returning();

		if (!row) {
			throw new NotFoundError(`Portfolio snapshot ${id} not found`);
		}

		return this.mapSnapshot(row);
	}

	async replaceSnapshotItems(
		snapshotId: string,
		items: CreatePortfolioSnapshotItemInput[],
		dbOverride?: Drizzle | NodePgTransaction<any, any>,
	): Promise<void> {
		const db = dbOverride ?? this.db;
		const now = this.now();

		await db.delete(portfolioSnapshotItemsTable).where(eq(portfolioSnapshotItemsTable.snapshotId, snapshotId));

		if (!items.length) {
			return;
		}

		await db.insert(portfolioSnapshotItemsTable).values(
			items.map((item) => ({
				id: uuidv4(),
				snapshotId,
				accountId: item.accountId,
				assetId: item.assetId,
				quantity: item.quantity,
				priceUsd: item.priceUsd,
				priceBase: item.priceBase,
				valueUsd: item.valueUsd,
				valueBase: item.valueBase,
				createdAt: now,
			})),
		);
	}

	async findAllByUser(
		userId: string,
		options?: SnapshotListFilters,
	): Promise<{ items: PorfolioSnapshot[]; totalCount: number }> {
		const { where } = this.buildWhere(userId, options);

		const [{ count }] = await this.db
			.select({ count: sql<number>`count(*)` })
			.from(portfolioSnapshotsTable)
			.where(where);

		const order =
			options?.order === "ASC"
				? asc(portfolioSnapshotsTable.snapshotDate)
				: desc(portfolioSnapshotsTable.snapshotDate);

		const baseQuery = this.db.select().from(portfolioSnapshotsTable).where(where).orderBy(order);

		const rows =
			options?.limit && options.limit > 0
				? await baseQuery.limit(options.limit).offset(options.offset ?? 0)
				: await baseQuery;

		return {
			items: rows.map((row) => this.mapSnapshot(row)),
			totalCount: Number(count ?? 0),
		};
	}

	async findWithDetails(
		userId: string,
		snapshotId: string,
	): Promise<{ snapshot: PorfolioSnapshot; items: SnapshotItemDetail[] } | null> {
		const snapshotRows = await this.db
			.select()
			.from(portfolioSnapshotsTable)
			.where(and(eq(portfolioSnapshotsTable.id, snapshotId), eq(portfolioSnapshotsTable.userId, userId)))
			.limit(1);

		const snapshotRow = snapshotRows[0];
		if (!snapshotRow) {
			return null;
		}

		const rows = await this.db
			.select({
				item: portfolioSnapshotItemsTable,
				account: {
					id: accountsTable.id,
					name: accountsTable.name,
					currencyCode: accountsTable.currencyCode,
				},
				asset: {
					id: assetsTable.id,
					symbol: assetsTable.symbol,
					name: assetsTable.name,
					asset_type: assetsTable.asset_type,
				},
				platform: {
					id: platformsTable.id,
					name: platformsTable.name,
					type: platformsTable.type,
				},
			})
			.from(portfolioSnapshotItemsTable)
			.innerJoin(accountsTable, eq(portfolioSnapshotItemsTable.accountId, accountsTable.id))
			.innerJoin(assetsTable, eq(portfolioSnapshotItemsTable.assetId, assetsTable.id))
			.innerJoin(platformsTable, eq(accountsTable.platformId, platformsTable.id))
			.where(eq(portfolioSnapshotItemsTable.snapshotId, snapshotId));

		const items = rows.map((row) => ({
			accountId: row.account.id,
			accountName: row.account.name,
			accountCurrencyCode: row.account.currencyCode,
			assetId: row.asset.id,
			assetSymbol: row.asset.symbol,
			assetName: row.asset.name,
			assetType: row.asset.asset_type,
			platformId: row.platform.id,
			platformName: row.platform.name,
			platformType: row.platform.type,
			quantity: toNumber(row.item.quantity),
			priceUsd: toNumber(row.item.priceUsd),
			priceBase: toNumber(row.item.priceBase),
			valueUsd: toNumber(row.item.valueUsd),
			valueBase: toNumber(row.item.valueBase),
		}));

		return {
			snapshot: this.mapSnapshot(snapshotRow),
			items,
		};
	}

	async runInTransaction<T>(handler: (tx: NodePgTransaction<any, any>) => Promise<T>): Promise<T> {
		return this.db.transaction(async (tx) => handler(tx));
	}
}
