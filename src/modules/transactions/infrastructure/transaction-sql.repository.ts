import { inject, injectable } from "tsyringe";
import { TransactionRepository } from "../domain/transaction.repository";
import { TOKENS } from "@shared/container/tokens";
import { Drizzle } from "@shared/database/drizzle/client";
import type { NodePgTransaction } from "drizzle-orm/node-postgres";
import { TransactionEntity } from "../domain/transaction.entity";
import { transactionsTable } from "./drizzle/transaction.schema";
import { and, asc, desc, eq, gte, ilike, lte, or, SQL, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { TransactionMapper } from "./transaction.mappers";
import { TransactionDetailsMapper } from "./mappers/transaction-details.mapper";
import {
	CreateTransactionInput,
	TransactionCorrectionType,
	TransactionListFilters,
	TransactionType,
} from "../domain/transaction.types";
import { TransactionDetailsRecord } from "../domain/transaction-details.types";
import { NotFoundError } from "@shared/errors/domain/not-found.error";
import { v4 as uuidv4 } from "uuid";
import { accountsTable, assetsTable, platformsTable } from "@shared/database/drizzle/schema";

const paymentAssetsTable = alias(assetsTable, "payment_assets");

const transactionSortColumns = {
	id: transactionsTable.id,
	transactionDate: transactionsTable.transactionDate,
	createdAt: transactionsTable.createdAt,
	totalAmount: transactionsTable.totalAmount,
	quantity: transactionsTable.quantity,
	transactionType: transactionsTable.transactionType,
	correctionType: transactionsTable.correctionType,
	accountId: transactionsTable.accountId,
	assetId: transactionsTable.assetId,
} as const;

@injectable()
export class TransactionSqlRepository implements TransactionRepository {
	constructor(@inject(TOKENS.Drizzle) private readonly db: Drizzle) {}

	private now(): number {
		return Date.now();
	}

	private buildWhere(userId: string, options?: TransactionListFilters) {
		const conditions: SQL[] = [eq(transactionsTable.userId, userId)];
		const toDecimalString = (value: number) => value.toString();

		if (options?.transactionType) {
			conditions.push(eq(transactionsTable.transactionType, options.transactionType));
		}

		if (options?.correctionType) {
			conditions.push(eq(transactionsTable.correctionType, options.correctionType));
		}

		if (options?.referenceTxId) {
			conditions.push(eq(transactionsTable.referenceTxId, options.referenceTxId));
		}

		if (options?.quantityMin !== undefined) {
			conditions.push(gte(transactionsTable.quantity, toDecimalString(options.quantityMin)));
		}

		if (options?.quantityMax !== undefined) {
			conditions.push(lte(transactionsTable.quantity, toDecimalString(options.quantityMax)));
		}

		if (options?.totalAmountMin !== undefined) {
			conditions.push(gte(transactionsTable.totalAmount, toDecimalString(options.totalAmountMin)));
		}

		if (options?.totalAmountMax !== undefined) {
			conditions.push(lte(transactionsTable.totalAmount, toDecimalString(options.totalAmountMax)));
		}

		if (options?.paymentAsset?.trim()) {
			const value = `%${options.paymentAsset.trim()}%`;
			const paymentAssetOr = or(
				ilike(paymentAssetsTable.symbol, value),
				ilike(paymentAssetsTable.name, value),
				ilike(paymentAssetsTable.id, value),
			);
			if (paymentAssetOr) {
				conditions.push(paymentAssetOr);
			}
		}

		if (options?.paymentQuantityMin !== undefined) {
			conditions.push(gte(transactionsTable.paymentQuantity, toDecimalString(options.paymentQuantityMin)));
		}

		if (options?.paymentQuantityMax !== undefined) {
			conditions.push(lte(transactionsTable.paymentQuantity, toDecimalString(options.paymentQuantityMax)));
		}

		if (options?.startDate !== undefined) {
			conditions.push(gte(transactionsTable.transactionDate, options.startDate));
		}

		if (options?.endDate !== undefined) {
			conditions.push(lte(transactionsTable.transactionDate, options.endDate));
		}

		if (options?.account?.trim()) {
			const value = `%${options.account.trim()}%`;
			const accountOr = or(ilike(accountsTable.name, value), ilike(accountsTable.id, value));
			if (accountOr) {
				conditions.push(accountOr);
			}
		}

		if (options?.asset?.trim()) {
			const value = `%${options.asset.trim()}%`;
			const assetOr = or(
				ilike(assetsTable.symbol, value),
				ilike(assetsTable.name, value),
				ilike(assetsTable.id, value),
			);
			if (assetOr) {
				conditions.push(assetOr);
			}
		}

		const where = and(...conditions);

		return { where };
	}

	private async getRawById(id: string) {
		const rows = await this.db.select().from(transactionsTable).where(eq(transactionsTable.id, id)).limit(1);
		return rows[0] ?? null;
	}

	async findById(id: string): Promise<TransactionEntity | null> {
		const rows = await this.db
			.select({
				transaction: transactionsTable,
				account: {
					id: accountsTable.id,
					name: accountsTable.name,
				},
				asset: {
					id: assetsTable.id,
					symbol: assetsTable.symbol,
					name: assetsTable.name,
				},
			})
			.from(transactionsTable)
			.innerJoin(accountsTable, eq(transactionsTable.accountId, accountsTable.id))
			.innerJoin(assetsTable, eq(transactionsTable.assetId, assetsTable.id))
			.where(eq(transactionsTable.id, id))
			.limit(1);

		return rows[0] ? TransactionMapper.toEntityWithDetails(rows[0]) : null;
	}

	async findDetailsById(id: string): Promise<TransactionDetailsRecord | null> {
		const rows = await this.db
			.select({
				transaction: transactionsTable,
				account: {
					id: accountsTable.id,
					name: accountsTable.name,
					currencyCode: accountsTable.currencyCode,
				},
				platform: {
					id: platformsTable.id,
					name: platformsTable.name,
					type: platformsTable.type,
				},
				asset: {
					id: assetsTable.id,
					symbol: assetsTable.symbol,
					name: assetsTable.name,
					asset_type: assetsTable.asset_type,
				},
				paymentAsset: {
					id: paymentAssetsTable.id,
					symbol: paymentAssetsTable.symbol,
					name: paymentAssetsTable.name,
					asset_type: paymentAssetsTable.asset_type,
				},
			})
			.from(transactionsTable)
			.innerJoin(accountsTable, eq(transactionsTable.accountId, accountsTable.id))
			.innerJoin(platformsTable, eq(accountsTable.platformId, platformsTable.id))
			.innerJoin(assetsTable, eq(transactionsTable.assetId, assetsTable.id))
			.innerJoin(paymentAssetsTable, eq(transactionsTable.paymentAssetId, paymentAssetsTable.id))
			.where(eq(transactionsTable.id, id))
			.limit(1);

		const row = rows[0];
		if (!row) {
			return null;
		}

		const feeTransactionsTable = alias(transactionsTable, "fee_transactions");
		const feeAssetsTable = alias(assetsTable, "fee_assets");

		const feeRows = await this.db
			.select({
				transaction: feeTransactionsTable,
				asset: {
					id: feeAssetsTable.id,
					symbol: feeAssetsTable.symbol,
					name: feeAssetsTable.name,
					asset_type: feeAssetsTable.asset_type,
				},
			})
			.from(feeTransactionsTable)
			.innerJoin(feeAssetsTable, eq(feeTransactionsTable.assetId, feeAssetsTable.id))
			.where(
				and(
					eq(feeTransactionsTable.referenceTxId, id),
					eq(feeTransactionsTable.transactionType, TransactionType.FEE),
				),
			);

		return TransactionDetailsMapper.toRecord(row, feeRows);
	}

	async findByUserId(
		userId: string,
		options?: TransactionListFilters,
	): Promise<{ items: TransactionEntity[]; totalCount: number }> {
		const { where } = this.buildWhere(userId, options);

		const [{ count }] = await this.db
			.select({ count: sql<number>`count(*)` })
			.from(transactionsTable)
			.innerJoin(accountsTable, eq(transactionsTable.accountId, accountsTable.id))
			.innerJoin(assetsTable, eq(transactionsTable.assetId, assetsTable.id))
			.leftJoin(paymentAssetsTable, eq(transactionsTable.paymentAssetId, paymentAssetsTable.id))
			.where(where);

		const baseQuery = this.db
			.select({
				transaction: transactionsTable,
				account: {
					id: accountsTable.id,
					name: accountsTable.name,
				},
				asset: {
					id: assetsTable.id,
					symbol: assetsTable.symbol,
					name: assetsTable.name,
				},
			})
			.from(transactionsTable)
			.innerJoin(accountsTable, eq(transactionsTable.accountId, accountsTable.id))
			.innerJoin(assetsTable, eq(transactionsTable.assetId, assetsTable.id))
			.leftJoin(paymentAssetsTable, eq(transactionsTable.paymentAssetId, paymentAssetsTable.id))
			.where(where);

		const sortColumn = options?.sortBy
			? transactionSortColumns[options.sortBy as keyof typeof transactionSortColumns]
			: undefined;
		if (sortColumn) {
			const direction = options?.sortDirection === "desc" ? desc : asc;
			baseQuery.orderBy(direction(sortColumn));
		}

		const rows =
			options?.pageSize && options.pageSize > 0
				? await baseQuery.limit(options.pageSize).offset(options.page ?? 0)
				: await baseQuery;

		return {
			items: TransactionMapper.toEntityListWithDetails(rows),
			totalCount: Number(count ?? 0),
		};
	}

	async create(
		input: CreateTransactionInput,
		dbOverride?: Drizzle | NodePgTransaction<any, any>,
	): Promise<TransactionEntity> {
		const now = this.now();
		const db = dbOverride ?? this.db;

		const [row] = await db
			.insert(transactionsTable)
			.values({
				id: uuidv4(),
				userId: input.userId,
				accountId: input.accountId,
				assetId: input.assetId,
				transactionType: input.transactionType,
				correctionType: input.correctionType,
				referenceTxId: input.referenceTxId,
				quantity: input.quantity,
				totalAmount: input.totalAmount,
				paymentAssetId: input.paymentAssetId,
				paymentQuantity: input.paymentQuantity,
				exchangeRate: input.exchangeRate,
				transactionDate: input.transactionDate,
				notes: input.notes,
				createdAt: now,
			})
			.returning();

		return TransactionMapper.toEntity(row);
	}

	async getAssetBalance(userId: string, accountId: string, assetId: string): Promise<number> {
		const [{ balance }] = await this.db
			.select({
				balance: sql<string>`coalesce(sum(${transactionsTable.quantity}), 0)`,
			})
			.from(transactionsTable)
			.where(
				and(
					eq(transactionsTable.userId, userId),
					eq(transactionsTable.accountId, accountId),
					eq(transactionsTable.assetId, assetId),
				),
			);

		const parsed = Number(balance ?? 0);
		return Number.isFinite(parsed) ? parsed : 0;
	}

	async runInTransaction<T>(handler: (tx: NodePgTransaction<any, any>) => Promise<T>): Promise<T> {
		return this.db.transaction(async (tx) => handler(tx));
	}

	async reverse(
		id: string,
		reason: string | null,
		dbOverride?: Drizzle | NodePgTransaction<any, any>,
	): Promise<TransactionEntity> {
		const row = await this.getRawById(id);
		if (!row) {
			throw new NotFoundError(`Transaction ${id} not found`);
		}

		const db = dbOverride ?? this.db;
		const now = this.now();
		const negate = (value: string) => (value.startsWith("-") ? value.slice(1) : `-${value}`);
		const quantity = negate(row.quantity);
		const totalAmount = negate(row.totalAmount);
		const paymentQuantity = negate(row.paymentQuantity);
		const exchangeRate = row.exchangeRate === null ? null : row.exchangeRate;

		const [created] = await db
			.insert(transactionsTable)
			.values({
				id: uuidv4(),
				userId: row.userId,
				accountId: row.accountId,
				assetId: row.assetId,
				transactionType: row.transactionType as TransactionType,
				correctionType: TransactionCorrectionType.REVERSE,
				referenceTxId: row.id,
				quantity: quantity,
				totalAmount: totalAmount,
				paymentAssetId: row.paymentAssetId,
				paymentQuantity,
				exchangeRate,
				transactionDate: row.transactionDate,
				notes: reason ?? row.notes ?? null,
				createdAt: now,
			})
			.returning();

		return TransactionMapper.toEntity(created);
	}

	async adjust(
		id: string,
		newData: Partial<CreateTransactionInput>,
		reason: string | null,
	): Promise<TransactionEntity> {
		const row = await this.getRawById(id);
		if (!row) {
			throw new NotFoundError(`Transaction ${id} not found`);
		}

		const now = this.now();
		const merged: CreateTransactionInput = {
			userId: row.userId,
			accountId: row.accountId,
			assetId: row.assetId,
			transactionType: row.transactionType as TransactionType,
			correctionType:
				(newData.correctionType as TransactionCorrectionType | null | undefined) ?? TransactionCorrectionType.ADJUST,
			referenceTxId: row.id,
			quantity: newData.quantity ?? row.quantity,
			totalAmount: newData.totalAmount ?? row.totalAmount,
			paymentAssetId: newData.paymentAssetId ?? row.paymentAssetId,
			paymentQuantity: newData.paymentQuantity ?? row.paymentQuantity,
			exchangeRate: row.exchangeRate,
			transactionDate: newData.transactionDate ?? row.transactionDate,
			notes: reason ?? newData.notes ?? row.notes ?? null,
		};

		const [created] = await this.db
			.insert(transactionsTable)
			.values({
				id: uuidv4(),
				userId: merged.userId,
				accountId: merged.accountId,
				assetId: merged.assetId,
				transactionType: merged.transactionType,
				correctionType: merged.correctionType,
				referenceTxId: merged.referenceTxId,
				quantity: merged.quantity,
				totalAmount: merged.totalAmount,
				paymentAssetId: merged.paymentAssetId,
				paymentQuantity: merged.paymentQuantity,
				exchangeRate: merged.exchangeRate,
				transactionDate: merged.transactionDate,
				notes: merged.notes,
				createdAt: now,
			})
			.returning();

		return TransactionMapper.toEntity(created);
	}

	async updateTransactionDate(
		id: string,
		transactionDate: number,
		dbOverride?: Drizzle | NodePgTransaction<any, any>,
	): Promise<TransactionEntity> {
		const db = dbOverride ?? this.db;
		const [row] = await db
			.update(transactionsTable)
			.set({ transactionDate })
			.where(eq(transactionsTable.id, id))
			.returning();

		if (!row) {
			throw new NotFoundError(`Transaction ${id} not found`);
		}

		return TransactionMapper.toEntity(row);
	}

	async updateFeeTransactionDatesByReference(
		referenceTxId: string,
		transactionDate: number,
		dbOverride?: Drizzle | NodePgTransaction<any, any>,
	): Promise<void> {
		const db = dbOverride ?? this.db;
		await db
			.update(transactionsTable)
			.set({ transactionDate })
			.where(
				and(
					eq(transactionsTable.referenceTxId, referenceTxId),
					eq(transactionsTable.transactionType, TransactionType.FEE),
				),
			);
	}
}
