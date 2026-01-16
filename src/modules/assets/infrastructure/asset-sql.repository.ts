import { inject, injectable } from "tsyringe";
import { AssetRepository } from "../domain/asset.repository";
import { TOKENS } from "@shared/container/tokens";
import { Drizzle } from "@shared/database/drizzle/client";
import { AssetEntity } from "../domain/asset.entity";
import { assetsTable } from "./drizzle/asset.schema";
import { and, eq, ilike, inArray, or, sql, SQL } from "drizzle-orm";
import { AssetMapper } from "./asset.mappers";
import { AssetListFilters, CreateAssetInput, UpdateAssetInput } from "../domain/asset.types";
import { NotFoundError } from "@shared/errors/domain/not-found.error";
import { v4 as uuidv4 } from "uuid";

@injectable()
export class AssetSqlRepository implements AssetRepository {
	constructor(@inject(TOKENS.Drizzle) private readonly db: Drizzle) {}

	private now(): number {
		return Date.now();
	}

	private buildWhere(options?: AssetListFilters) {
		const conditions: SQL[] = [];

		const searchValue = options?.search?.trim();

		if (searchValue && searchValue.length > 0) {
			const searchCondition = or(
				ilike(assetsTable.symbol, `%${searchValue}%`),
				ilike(assetsTable.name, `%${searchValue}%`),
			);

			if (searchCondition) {
				conditions.push(searchCondition);
			}
		}

		if (options?.type) {
			conditions.push(eq(assetsTable.asset_type, options.type));
		}

		return conditions.length ? and(...conditions) : undefined;
	}

	async findById(id: string): Promise<AssetEntity | null> {
		const rows = await this.db.select().from(assetsTable).where(eq(assetsTable.id, id)).limit(1);

		return rows[0] ? AssetMapper.toEntity(rows[0]) : null;
	}

	async findAll(options?: AssetListFilters): Promise<{ items: AssetEntity[]; totalCount: number }> {
		const where = this.buildWhere(options);

		const countQuery = this.db.select({ count: sql<number>`count(*)` }).from(assetsTable);
		const dataQuery = this.db.select().from(assetsTable);

		if (where) {
			countQuery.where(where);
			dataQuery.where(where);
		}

		const [{ count }] = await countQuery;

		const rows =
			options?.limit && options.limit > 0
				? await dataQuery.limit(options.limit).offset(options.offset ?? 0)
				: await dataQuery;

		return {
			items: AssetMapper.toEntityList(rows),
			totalCount: Number(count ?? 0),
		};
	}

	async findByIdentifiers(identifiers: string[]): Promise<AssetEntity[]> {
		const normalized = identifiers
			.map((value) => value.trim())
			.filter((value) => value.length > 0);

		if (!normalized.length) {
			return [];
		}

		const conditions = or(
			inArray(assetsTable.id, normalized),
			inArray(assetsTable.symbol, normalized),
			inArray(assetsTable.name, normalized),
		);

		const rows = conditions ? await this.db.select().from(assetsTable).where(conditions) : [];
		return AssetMapper.toEntityList(rows);
	}

	async create(input: CreateAssetInput): Promise<AssetEntity> {
		const now = this.now();

		const [row] = await this.db
			.insert(assetsTable)
			.values({
				id: uuidv4(),
				symbol: input.symbol,
				name: input.name,
				asset_type: input.asset_type,
				pricing_source: input.pricing_source,
				external_id: input.external_id,
				quote_currency: input.quote_currency,
				createdAt: now,
				updatedAt: now,
			})
			.returning();

		return AssetMapper.toEntity(row);
	}

	async update(id: string, input: UpdateAssetInput): Promise<AssetEntity> {
		const now = this.now();

		const [row] = await this.db
			.update(assetsTable)
			.set({
				...input,
				updatedAt: now,
			})
			.where(eq(assetsTable.id, id))
			.returning();

		if (!row) {
			throw new NotFoundError(`Asset with id ${id} not found`);
		}

		return AssetMapper.toEntity(row);
	}

	async delete(id: string): Promise<void> {
		await this.db.delete(assetsTable).where(eq(assetsTable.id, id)).returning();
	}
}
