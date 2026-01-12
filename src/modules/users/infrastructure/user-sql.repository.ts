import { inject, injectable } from "tsyringe";
import { UserRepository } from "../domain/user.repository";
import { TOKENS } from "@shared/container/tokens";
import { Drizzle } from "@shared/database/drizzle/client";
import { UserEntity } from "../domain/user.entity";
import { usersTable } from "./drizzle/user.schema";
import { eq } from "drizzle-orm";
import { UserMapper } from "./user.mappers";
import { CreateUserInput, UpdateUserInput } from "../domain/user.types";
import bcrypt from "bcryptjs";
import { NotFoundError } from "@shared/errors/domain/not-found.error";

@injectable()
export class UserSqlRepository implements UserRepository {
	constructor(@inject(TOKENS.Drizzle) private readonly db: Drizzle) {}

	private now(): number {
		return Date.now();
	}

	async findById(id: string): Promise<UserEntity | null> {
		const rows = await this.db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);

		return rows[0] ? UserMapper.toEntity(rows[0]) : null;
	}

	async findByEmail(email: string): Promise<UserEntity | null> {
		const rows = await this.db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);

		return rows[0] ? UserMapper.toEntity(rows[0]) : null;
	}

	async create(input: CreateUserInput): Promise<UserEntity> {
		const now = this.now();
		const salt = bcrypt.genSaltSync(10);
		const passwordHash = bcrypt.hashSync(input.password, salt);

		const [row] = await this.db
			.insert(usersTable)
			.values({
				id: crypto.randomUUID(),

				firstName: input.firstName,
				lastName: input.lastName,
				email: input.email,
				passwordHash,

				createdAt: now,
				updatedAt: now,
			})
			.returning();

		return UserMapper.toEntity(row);
	}

	async update(id: string, input: UpdateUserInput): Promise<UserEntity> {
		const now = this.now();
		let passwordHash: string | undefined = undefined;
		if (input.newPassword) {
			const salt = bcrypt.genSaltSync(10);
			passwordHash = bcrypt.hashSync(input.newPassword, salt);
		}

		const [row] = await this.db
			.update(usersTable)
			.set({
				...input,
				...(passwordHash && { passwordHash }),
				updatedAt: now,
			})
			.where(eq(usersTable.id, id))
			.returning();

		if (!row) {
			throw new NotFoundError(`User with id ${id} not found`);
		}

		return UserMapper.toEntity(row);
	}
}
