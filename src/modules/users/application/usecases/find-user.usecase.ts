import { UserRepository } from "@modules/users/domain/user.repository";
import { UserMapper } from "@modules/users/infrastructure/user.mappers";
import { TOKENS } from "@shared/container/tokens";
import { ValidationError } from "@shared/errors/domain/validation.error";
import { inject, injectable } from "tsyringe";

@injectable()
export class FindUserUseCase {
	constructor(@inject(TOKENS.UserRepository) private userRepository: UserRepository) {}

	async execute(id: string) {
		if (!id || typeof id !== "string") {
			throw new ValidationError("Invalid user ID", "id");
		}

		const user = await this.userRepository.findById(id);

		if (!user) {
			return null;
		}

		return UserMapper.toSafeUser(user);
	}
}
