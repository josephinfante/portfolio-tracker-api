import { UserRepository } from "@modules/users/domain/user.repository";
import { TOKENS } from "@shared/container/tokens";
import { inject, injectable } from "tsyringe";
import { PasswordHasher } from "../services/password-hasher.service";
import { TokenService } from "../services/token.service";
import { ValidationError } from "@shared/errors/domain/validation.error";
import { AuthMapper } from "@modules/auth/infrastructure/auth.mapper";

@injectable()
export class SignInUseCase {
	constructor(
		@inject(TOKENS.UserRepository) private userRepository: UserRepository,
		@inject(TOKENS.PasswordHasher) private passwordHasher: PasswordHasher,
		@inject(TOKENS.TokenService) private tokenService: TokenService,
	) {}

	async execute(email: string, password: string) {
		const user = await this.userRepository.findByEmail(email);
		if (!user) {
			throw new ValidationError("Invalid email or password");
		}

		const valid = await this.passwordHasher.compare(password, user.passwordHash);

		if (!valid) {
			throw new ValidationError("Invalid email or password");
		}

		const token = await this.tokenService.sign({
			sub: user.id,
			email: user.email,
		});

		return AuthMapper.toSafeUserWithToken(user, token);
	}
}
