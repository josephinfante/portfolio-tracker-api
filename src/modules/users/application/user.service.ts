import { injectable } from "tsyringe";
import { CreateUserUseCase } from "./usecases/create-user.usecase";
import { UpdateUserUseCase } from "./usecases/update-user.usecase";
import { CreateUserInput } from "../domain/user.types";
import { UserEntity } from "../domain/user.entity";
import { FindUserUseCase } from "./usecases/find-user.usecase";

@injectable()
export class UserService {
	constructor(
		private createUserUseCase: CreateUserUseCase,
		private updateUserUseCase: UpdateUserUseCase,
		private findUserUseCase: FindUserUseCase,
	) {}

	async createUser(input: CreateUserInput): Promise<Partial<Omit<UserEntity, "passwordHash">> | null> {
		return await this.createUserUseCase.execute(input);
	}

	async updateUser(id: string, input: unknown): Promise<Partial<Omit<UserEntity, "passwordHash">> | null> {
		return await this.updateUserUseCase.execute(id, input);
	}

	async find(id: string): Promise<Partial<Omit<UserEntity, "passwordHash">> | null> {
		return await this.findUserUseCase.execute(id);
	}
}
