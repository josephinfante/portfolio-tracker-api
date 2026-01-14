import { PlatformRepository } from "@modules/platforms/domain/platform.repository";
import { TOKENS } from "@shared/container/tokens";
import { inject, injectable } from "tsyringe";
import { CreatePlatformSchema } from "../validators/create-platform.validator";
import { ValidationError } from "@shared/errors/domain/validation.error";
import { zodErrorMapper } from "@shared/helpers/zod-error-mapper";

@injectable()
export class CreatePlatformUseCase {
	constructor(@inject(TOKENS.PlatformRepository) private platformRepository: PlatformRepository) {}

	async execute(userId: string, input: unknown) {
		if (!userId || typeof userId !== "string") {
			throw new ValidationError("Invalid user ID", "userId");
		}

		const result = CreatePlatformSchema.safeParse(input);
		if (!result.success) {
			throw new ValidationError("Invalid platform data", undefined, undefined, {
				context: { errors: zodErrorMapper(result.error) },
			});
		}

		const data = result.data;

		return await this.platformRepository.create({
			userId,
			name: data.name,
			type: data.type,
			country: data.country,
		});
	}
}
