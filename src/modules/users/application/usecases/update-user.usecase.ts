import { UserRepository } from "@modules/users/domain/user.repository";
import { TOKENS } from "@shared/container/tokens";
import { inject, injectable } from "tsyringe";
import { UpdateUserSchema } from "../validators/user-update.validator";
import { ValidationError } from "@shared/errors/domain/validation.error";
import { zodErrorMapper } from "@shared/helpers/zod-error-mapper";
import { NotFoundError } from "@shared/errors/domain/not-found.error";
import { UserMapper } from "@modules/users/infrastructure/user.mappers";

@injectable()
export class UpdateUserUseCase {
	constructor(@inject(TOKENS.UserRepository) private readonly userRepository: UserRepository) {}

	async execute(id: string, input: unknown) {
		// Zod validation
		const result = UpdateUserSchema.safeParse(input);
		if (!result.success) {
			throw new ValidationError("Invalid user data", undefined, undefined, {
				context: { errors: zodErrorMapper(result.error) },
			});
		}

		const data = result.data;

		// Search for existing user
		const user = await this.userRepository.findById(id);
		if (!user) throw new NotFoundError(`User ${id} not found`);

		// If user provides oldPassword and newPassword, verify oldPassword
		if (data.oldPassword && data.newPassword) {
			const bcrypt = await import("bcryptjs");
			const isOldPasswordValid = bcrypt.compareSync(data.oldPassword, user.passwordHash);
			if (!isOldPasswordValid) {
				throw new ValidationError("Old password is incorrect", "oldPassword");
			}
		} else if (data.newPassword && !data.oldPassword) {
			// If newPassword is provided without oldPassword, throw error
			throw new ValidationError("Old password is required to set a new password", "oldPassword");
		}

		// Update user
		const updatedUser = await this.userRepository.update(id, data);
		return UserMapper.toSafeUser(updatedUser);
	}
}
