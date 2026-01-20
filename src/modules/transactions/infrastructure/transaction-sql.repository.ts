import { inject, injectable } from "tsyringe";
import { TransactionRepository } from "../domain/transaction.repository";
import { TOKENS } from "@shared/container/tokens";
import { Drizzle } from "@shared/database/drizzle/client";
import type { NodePgTransaction } from "drizzle-orm/node-postgres";
import { TransactionEntity } from "../domain/transaction.entity";
import { transactionsTable } from "./drizzle/transaction.schema";
import { and, eq, gte, ilike, lte, or, SQL, sql } from "drizzle-orm";
import { TransactionMapper } from "./transaction.mappers";
import {
	CreateTransactionInput,
	TransactionCorrectionType,
	TransactionListFilters,
	TransactionType,
} from "../domain/transaction.types";
import { NotFoundError } from "@shared/errors/domain/not-found.error";
import { v4 as uuidv4 } from "uuid";
import { accountsTable, assetsTable } from "@shared/database/drizzle/schema";

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

		if (options?.paymentAssetId) {
			conditions.push(eq(transactionsTable.paymentAssetId, options.paymentAssetId));
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
			.where(where);

		const rows =
			options?.limit && options.limit > 0
				? await baseQuery.limit(options.limit).offset(options.offset ?? 0)
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
}
