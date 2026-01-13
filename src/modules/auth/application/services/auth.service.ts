import { injectable } from "tsyringe";
import { SignUpUseCase } from "../usecases/sign-up.usecase";
import { SignInUseCase } from "../usecases/sign-in.usecase";
import { AuthResponse, SignUpInput } from "@modules/auth/domain/auth.types";

@injectable()
export class AuthService {
	constructor(
		private signUpUseCase: SignUpUseCase,
		private signInUseCase: SignInUseCase,
	) {}

	async signUp(input: SignUpInput): Promise<AuthResponse> {
		return await this.signUpUseCase.execute(input);
	}

	async signIn(email: string, password: string): Promise<AuthResponse> {
		return await this.signInUseCase.execute(email, password);
	}
}
