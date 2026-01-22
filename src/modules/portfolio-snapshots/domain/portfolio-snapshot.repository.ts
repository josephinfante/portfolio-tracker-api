import { PorfolioSnapshot } from "./portfolio-snapshot.entity";
import { Drizzle } from "@shared/database/drizzle/client";
import type { NodePgTransaction } from "drizzle-orm/node-postgres";
import { SnapshotListFilters } from "./portfolio-snapshot.types";

export type CreatePortfolioSnapshotInput = {
	userId: string;
	snapshotDate: string; // YYYY-MM-DD
	baseCurrency: string;
	fxUsdToBase: number;
	totalValueUsd: number;
	totalValueBase: number;
};

export type UpdatePortfolioSnapshotInput = {
	baseCurrency: string;
	fxUsdToBase: number;
	totalValueUsd: number;
	totalValueBase: number;
};

export type CreatePortfolioSnapshotItemInput = {
	accountId: string;
	assetId: string;
	quantity: number;
	priceUsd: number;
	priceBase: number;
	valueUsd: number;
	valueBase: number;
};

export type SnapshotItemDetail = {
	accountId: string;
	accountName: string;
	accountCurrencyCode: string | null;
	assetId: string;
	assetSymbol: string;
	assetName: string;
	assetType: string;
	platformId: string;
	platformName: string;
	platformType: string;
	quantity: number;
	priceUsd: number;
	priceBase: number;
	valueUsd: number;
	valueBase: number;
};

export interface PortfolioSnapshotRepository {
	findByUserAndDate(
		userId: string,
		snapshotDate: string,
		db?: Drizzle | NodePgTransaction<any, any>,
	): Promise<PorfolioSnapshot | null>;
	createSnapshot(
		input: CreatePortfolioSnapshotInput,
		db?: Drizzle | NodePgTransaction<any, any>,
	): Promise<PorfolioSnapshot>;
	updateSnapshot(
		id: string,
		input: UpdatePortfolioSnapshotInput,
		db?: Drizzle | NodePgTransaction<any, any>,
	): Promise<PorfolioSnapshot>;
	replaceSnapshotItems(
		snapshotId: string,
		items: CreatePortfolioSnapshotItemInput[],
		db?: Drizzle | NodePgTransaction<any, any>,
	): Promise<void>;
	findAllByUser(
		userId: string,
		options?: SnapshotListFilters,
	): Promise<{ items: PorfolioSnapshot[]; totalCount: number }>;
	findLatestByUser(userId: string): Promise<PorfolioSnapshot | null>;
	findSnapshotsForPerformance(userId: string, startDate?: string): Promise<PorfolioSnapshot[]>;
	findWithDetails(
		userId: string,
		snapshotId: string,
	): Promise<{ snapshot: PorfolioSnapshot; items: SnapshotItemDetail[] } | null>;
	runInTransaction<T>(handler: (tx: NodePgTransaction<any, any>) => Promise<T>): Promise<T>;
}
