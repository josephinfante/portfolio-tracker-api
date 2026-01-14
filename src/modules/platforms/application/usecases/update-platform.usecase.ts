import { PlatformRepository } from "@modules/platforms/domain/platform.repository";
import { TOKENS } from "@shared/container/tokens";
import { inject, injectable } from "tsyringe";
import { UpdatePlatformSchema } from "../validators/update-platform.validator";
import { ValidationError } from "@shared/errors/domain/validation.error";
import { zodErrorMapper } from "@shared/helpers/zod-error-mapper";
import { NotFoundError } from "@shared/errors/domain/not-found.error";
import { applyPatch } from "@shared/helpers/apply-patch";

@injectable()
export class UpdatePlatformUseCase {
	constructor(@inject(TOKENS.PlatformRepository) private platformRepository: PlatformRepository) {}

	async execute(id: string, userId: string, input: unknown) {
		if (!id || typeof id !== "string") {
			throw new ValidationError("Invalid platform ID", "id");
		}

		if (!userId || typeof userId !== "string") {
			throw new ValidationError("Invalid user ID", "userId");
		}

		const result = UpdatePlatformSchema.safeParse(input);
		if (!result.success) {
			throw new ValidationError("Invalid platform data", undefined, undefined, {
				context: { errors: zodErrorMapper(result.error) },
			});
		}

		const data = result.data;

		const platform = await this.platformRepository.findById(id);
		if (!platform) {
			throw new NotFoundError(`Platform ${id} not found`);
		}

		const patch = applyPatch(platform, data, ["name", "type", "country"]);

		if (Object.keys(patch).length === 0) {
			return platform;
		}

		return this.platformRepository.update(id, patch);
	}
}
