import { AssetRepository } from "@modules/assets/domain/asset.repository";
import { TOKENS } from "@shared/container/tokens";
import { ValidationError } from "@shared/errors/domain/validation.error";
import { inject, injectable } from "tsyringe";
import { NotFoundError } from "@shared/errors/domain/not-found.error";

@injectable()
export class DeleteAssetUseCase {
	constructor(@inject(TOKENS.AssetRepository) private assetRepository: AssetRepository) {}

	async execute(id: string) {
		if (!id || typeof id !== "string") {
			throw new ValidationError("Invalid asset ID", "id");
		}

		const asset = await this.assetRepository.findById(id);
		if (!asset) {
			throw new NotFoundError(`Asset ${id} not found`);
		}

		await this.assetRepository.delete(id);
	}
}
