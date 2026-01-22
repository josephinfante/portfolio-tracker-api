import { inject, injectable } from "tsyringe";
import { PlatformRepository } from "../domain/platform.repository";
import { TOKENS } from "@shared/container/tokens";
import { Drizzle } from "@shared/database/drizzle/client";
import { PlatformEntity } from "../domain/platform.entity";
import { platformsTable } from "./drizzle/platform.schema";
import { and, asc, desc, eq, ilike, sql } from "drizzle-orm";
import { PlatformMapper } from "./platform.mappers";
import { CreatePlatformInput, FindByUserIdFilters, UpdatePlatformInput } from "../domain/platform.types";
import { NotFoundError } from "@shared/errors/domain/not-found.error";
import { v4 as uuidv4 } from "uuid";

const platformSortColumns = {
	id: platformsTable.id,
	name: platformsTable.name,
	type: platformsTable.type,
	country: platformsTable.country,
	createdAt: platformsTable.createdAt,
	updatedAt: platformsTable.updatedAt,
} as const;

@injectable()
export class PlatformSqlRepository implements PlatformRepository {
	constructor(@inject(TOKENS.Drizzle) private readonly db: Drizzle) {}

	private now(): number {
		return Date.now();
	}

	private buildWhere(userId: string, options?: FindByUserIdFilters) {
		const conditions = [eq(platformsTable.userId, userId)];

		if (options?.search) {
			conditions.push(ilike(platformsTable.name, `%${options.search}%`));
		}

		if (options?.type) {
			conditions.push(eq(platformsTable.type, options.type));
		}

		return conditions.length ? and(...conditions) : undefined;
	}

	async findById(id: string): Promise<PlatformEntity | null> {
		const rows = await this.db.select().from(platformsTable).where(eq(platformsTable.id, id)).limit(1);

		return rows[0] ? PlatformMapper.toEntity(rows[0]) : null;
	}

	async findByUserId(
		userId: string,
		options?: FindByUserIdFilters,
	): Promise<{ items: PlatformEntity[]; totalCount: number }> {
		const where = this.buildWhere(userId, options);

		const [{ count }] = await this.db
			.select({ count: sql<number>`count(*)` })
			.from(platformsTable)
			.where(where);

		const query = this.db.select().from(platformsTable).where(where);

		const sortColumn = options?.sortBy
			? platformSortColumns[options.sortBy as keyof typeof platformSortColumns]
			: undefined;
		if (sortColumn) {
			const direction = options?.sortDirection === "desc" ? desc : asc;
			query.orderBy(direction(sortColumn));
		}

		const rows =
			options?.pageSize && options.pageSize > 0
				? await query.limit(options.pageSize).offset(options.page ?? 0)
				: await query;

		return {
			items: PlatformMapper.toEntityList(rows),
			totalCount: Number(count ?? 0),
		};
	}

	async create(input: CreatePlatformInput): Promise<PlatformEntity> {
		const now = this.now();

		const [row] = await this.db
			.insert(platformsTable)
			.values({
				id: uuidv4(),
				userId: input.userId,

				name: input.name,
				type: input.type,
				country: input.country,

				createdAt: now,
				updatedAt: now,
			})
			.returning();

		return PlatformMapper.toEntity(row);
	}

	async update(id: string, input: UpdatePlatformInput): Promise<PlatformEntity> {
		const now = this.now();

		const [row] = await this.db
			.update(platformsTable)
			.set({
				...input,
				updatedAt: now,
			})
			.where(eq(platformsTable.id, id))
			.returning();

		if (!row) {
			throw new NotFoundError(`Platform with id ${id} not found`);
		}

		return PlatformMapper.toEntity(row);
	}

	async delete(id: string): Promise<void> {
		await this.db.delete(platformsTable).where(eq(platformsTable.id, id)).returning();
	}
}
