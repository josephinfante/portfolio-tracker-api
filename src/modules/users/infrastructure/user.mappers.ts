import { UserEntity } from "../domain/user.entity";
import { usersTable } from "./drizzle/user.schema";

export class UserMapper {
	static toEntity(row: typeof usersTable.$inferSelect): UserEntity {
		return {
			id: row.id,
			firstName: row.firstName,
			lastName: row.lastName,
			email: row.email,
			passwordHash: row.passwordHash,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
		};
	}

	static toEntityList(rows: (typeof usersTable.$inferSelect)[]): UserEntity[] {
		return rows.map((row) => this.toEntity(row));
	}

	static toSafeUser(user: UserEntity): Partial<Omit<UserEntity, "passwordHash">> {
		const { passwordHash, ...safeUser } = user;
		return safeUser;
	}
}
