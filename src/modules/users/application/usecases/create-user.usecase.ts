import { UserRepository } from "@modules/users/domain/user.repository";
import { TOKENS } from "@shared/container/tokens";
import { inject, injectable } from "tsyringe";
import { CreateUserSchema } from "../validators/user-create.validator";
import { ValidationError } from "@shared/errors/domain/validation.error";
import { zodErrorMapper } from "@shared/helpers/zod-error-mapper";
import { UserMapper } from "@modules/users/infrastructure/user.mappers";

@injectable()
export class CreateUserUseCase {
	constructor(@inject(TOKENS.UserRepository) private userRepository: UserRepository) {}

	async execute(input: unknown) {
		// Zod validation
		const result = CreateUserSchema.safeParse(input);
		if (!result.success) {
			console.log(result.error);
			throw new ValidationError("Invalid user data", undefined, undefined, {
				context: { errors: zodErrorMapper(result.error) },
			});
		}

		const data = result.data;

		// Check if user with email already exists
		const existingUser = await this.userRepository.findByEmail(data.email);
		if (existingUser) {
			throw new ValidationError("Email already in use", undefined, undefined, {
				context: { errors: { email: ["Email already in use"] } },
			});
		}

		// Create user
		const newUser = await this.userRepository.create(data);
		return UserMapper.toSafeUser(newUser);
	}
}
