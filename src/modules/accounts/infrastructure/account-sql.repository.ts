import { inject, injectable } from "tsyringe";
import { AccountRepository } from "../domain/account.repository";
import { TOKENS } from "@shared/container/tokens";
import { Drizzle } from "@shared/database/drizzle/client";
import { AccountEntity } from "../domain/account.entity";
import { accountsTable } from "./drizzle/account.schema";
import { and, eq, ilike, or, SQL, sql } from "drizzle-orm";
import { AccountMapper } from "./account.mappers";
import { AccountListFilters, CreateAccountInput, UpdateAccountInput } from "../domain/account.types";
import { NotFoundError } from "@shared/errors/domain/not-found.error";
import { v4 as uuidv4 } from "uuid";
import { platformsTable } from "@shared/database/drizzle/schema";

@injectable()
export class AccountSqlRepository implements AccountRepository {
	constructor(@inject(TOKENS.Drizzle) private readonly db: Drizzle) {}

	private now(): number {
		return Date.now();
	}

	private buildWhere(userId: string, options?: AccountListFilters) {
		const conditions: SQL[] = [eq(accountsTable.userId, userId)];

		if (options?.search?.trim()) {
			conditions.push(ilike(accountsTable.name, `%${options.search.trim()}%`));
		}

		if (options?.platform?.trim()) {
			const value = `%${options.platform.trim()}%`;

			const platformOr = or(
				ilike(platformsTable.name, value),
				ilike(sql`cast(${platformsTable.type} as text)`, value),
				ilike(platformsTable.id, value),
			);

			if (platformOr) {
				conditions.push(platformOr);
			}
		}

		const where = and(...conditions);

		return { where };
	}

	async findById(id: string): Promise<AccountEntity | null> {
		const rows = await this.db
			.select({
				account: accountsTable,
				platform: {
					id: platformsTable.id,
					name: platformsTable.name,
					type: platformsTable.type,
				},
			})
			.from(accountsTable)
			.innerJoin(platformsTable, eq(accountsTable.platformId, platformsTable.id))
			.where(eq(accountsTable.id, id))
			.limit(1);

		return rows[0] ? AccountMapper.toEntityWithPlatform(rows[0]) : null;
	}

	async findByUserId(
		userId: string,
		options?: AccountListFilters,
	): Promise<{ items: AccountEntity[]; totalCount: number }> {
		const { where } = this.buildWhere(userId, options);

		const [{ count }] = await this.db
			.select({ count: sql<number>`count(*)` })
			.from(accountsTable)
			.innerJoin(platformsTable, eq(accountsTable.platformId, platformsTable.id))
			.where(where);

		const baseQuery = this.db
			.select({
				account: accountsTable,
				platform: {
					id: platformsTable.id,
					name: platformsTable.name,
					type: platformsTable.type,
				},
			})
			.from(accountsTable)
			.innerJoin(platformsTable, eq(accountsTable.platformId, platformsTable.id))
			.where(where);

		const rows =
			options?.limit && options.limit > 0
				? await baseQuery.limit(options.limit).offset(options.offset ?? 0)
				: await baseQuery;

		return {
			items: AccountMapper.toEntityListWithPlatform(rows),
			totalCount: Number(count ?? 0),
		};
	}

	async create(input: CreateAccountInput): Promise<AccountEntity> {
		const now = this.now();

		const [row] = await this.db
			.insert(accountsTable)
			.values({
				id: uuidv4(),
				userId: input.userId,
				platformId: input.platformId,
				name: input.name,
				currencyCode: input.currencyCode ?? null,
				createdAt: now,
				updatedAt: now,
			})
			.returning();

		return AccountMapper.toEntity(row);
	}

	async update(id: string, input: UpdateAccountInput): Promise<AccountEntity> {
		const now = this.now();

		const [row] = await this.db
			.update(accountsTable)
			.set({
				...input,
				updatedAt: now,
			})
			.where(eq(accountsTable.id, id))
			.returning();

		if (!row) {
			throw new NotFoundError(`Account with id ${id} not found`);
		}

		return AccountMapper.toEntity(row);
	}

	async delete(id: string): Promise<void> {
		await this.db.delete(accountsTable).where(eq(accountsTable.id, id)).returning();
	}
}
