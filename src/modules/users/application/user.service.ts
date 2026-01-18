import { injectable } from "tsyringe";
import { UpdateUserUseCase } from "./usecases/update-user.usecase";
import { UserEntity } from "../domain/user.entity";
import { FindUserUseCase } from "./usecases/find-user.usecase";

@injectable()
export class UserService {
	constructor(
		private updateUserUseCase: UpdateUserUseCase,
		private findUserUseCase: FindUserUseCase,
	) {}

	async updateUser(id: string, input: unknown): Promise<Partial<Omit<UserEntity, "passwordHash">> | null> {
		return await this.updateUserUseCase.execute(id, input);
	}

	async find(id: string): Promise<Partial<Omit<UserEntity, "passwordHash">> | null> {
		return await this.findUserUseCase.execute(id);
	}
}
