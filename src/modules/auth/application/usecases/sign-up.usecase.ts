import { UserRepository } from "@modules/users/domain/user.repository";
import { TOKENS } from "@shared/container/tokens";
import { inject, injectable } from "tsyringe";
import { PasswordHasher } from "../services/password-hasher.service";
import { TokenService } from "../services/token.service";
import { SignUpSchema } from "../validators/sign-up.validator";
import { ValidationError } from "@shared/errors/domain/validation.error";
import { zodErrorMapper } from "@shared/helpers/zod-error-mapper";
import { AuthMapper } from "@modules/auth/infrastructure/auth.mapper";
import { ConflictError } from "@shared/errors/domain/conflict.error";

@injectable()
export class SignUpUseCase {
	constructor(
		@inject(TOKENS.UserRepository) private userRepository: UserRepository,
		@inject(TOKENS.PasswordHasher) private passwordHasher: PasswordHasher,
		@inject(TOKENS.TokenService) private tokenService: TokenService,
	) {}

	async execute(input: unknown) {
		// Zod validation
		const result = SignUpSchema.safeParse(input);
		if (!result.success) {
			throw new ValidationError("Invalid user data", undefined, undefined, {
				context: { errors: zodErrorMapper(result.error) },
			});
		}

		const data = result.data;

		// Check if user with email already exists
		const existingUser = await this.userRepository.findByEmail(data.email);
		if (existingUser) {
			throw new ConflictError("Unable to complete request");
		}

		// Create user
		const passwordHash = await this.passwordHasher.hash(data.password);
		const newUser = await this.userRepository.create({
			firstName: data.firstName,
			lastName: data.lastName,
			email: data.email,
			password: passwordHash,
			baseCurrency: data.baseCurrency,
		});

		const token = await this.tokenService.sign({
			sub: newUser.id,
			email: newUser.email,
		});
		return AuthMapper.toSafeUserWithToken(newUser, token);
	}
}
