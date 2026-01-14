import { AssetRepository } from "@modules/assets/domain/asset.repository";
import { TOKENS } from "@shared/container/tokens";
import { ValidationError } from "@shared/errors/domain/validation.error";
import { inject, injectable } from "tsyringe";
import { NotFoundError } from "@shared/errors/domain/not-found.error";
import { AuthorizationError } from "@shared/errors/domain/authorization.error";

@injectable()
export class DeleteAssetUseCase {
	constructor(@inject(TOKENS.AssetRepository) private assetRepository: AssetRepository) {}

	async execute(id: string, userId: string) {
		if (!id || typeof id !== "string") {
			throw new ValidationError("Invalid asset ID", "id");
		}

		if (!userId || typeof userId !== "string") {
			throw new ValidationError("Invalid user ID", "userId");
		}

		const asset = await this.assetRepository.findById(id);
		if (!asset) {
			throw new NotFoundError(`Asset ${id} not found`);
		}

		if (asset.userId !== userId) {
			throw new AuthorizationError("Access denied");
		}

		await this.assetRepository.delete(id);
	}
}
