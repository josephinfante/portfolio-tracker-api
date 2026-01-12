import { UserEntity } from "./user.entity";
import { CreateUserInput, UpdateUserInput } from "./user.types";

export interface UserRepository {
	findById(id: string): Promise<UserEntity | null>;
	findByEmail(email: string): Promise<UserEntity | null>;

	create(data: CreateUserInput): Promise<UserEntity>;
	update(id: string, data: UpdateUserInput): Promise<UserEntity>;
}
