import { PlatformRepository } from "@modules/platforms/domain/platform.repository";
import { TOKENS } from "@shared/container/tokens";
import { ValidationError } from "@shared/errors/domain/validation.error";
import { inject, injectable } from "tsyringe";
import { NotFoundError } from "@shared/errors/domain/not-found.error";
import { AuthorizationError } from "@shared/errors/domain/authorization.error";

@injectable()
export class FindPlatformUseCase {
	constructor(@inject(TOKENS.PlatformRepository) private platformRepository: PlatformRepository) {}

	async execute(id: string, userId: string) {
		if (!id || typeof id !== "string") {
			throw new ValidationError("Invalid platform ID", "id");
		}

		if (!userId || typeof userId !== "string") {
			throw new ValidationError("Invalid user ID", "userId");
		}

		const platform = await this.platformRepository.findById(id);

		if (!platform) {
			throw new NotFoundError(`Platform ${id} not found`);
		}

		if (platform.userId !== userId) {
			throw new AuthorizationError("Access denied");
		}

		return platform;
	}
}
