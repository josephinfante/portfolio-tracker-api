import { TOKENS } from "@shared/container/tokens";
import { container } from "tsyringe";
import { SignUpUseCase } from "./application/usecases/sign-up.usecase";
import { SignInUseCase } from "./application/usecases/sign-in.usecase";
import { AuthService } from "./application/services/auth.service";
import { AuthController } from "./infrastructure/http/auth.controller";

export function registerAuthModule(): void {
	// Use cases
	container.register(SignUpUseCase, { useClass: SignUpUseCase });
	container.register(SignInUseCase, { useClass: SignInUseCase });

	// Application service
	container.register(AuthService, { useClass: AuthService });

	// Controller
	container.register(AuthController, { useClass: AuthController });
}
