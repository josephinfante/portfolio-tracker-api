import { AssetRepository } from "@modules/assets/domain/asset.repository";
import { TOKENS } from "@shared/container/tokens";
import { inject, injectable } from "tsyringe";
import { UpdateAssetSchema } from "../validators/update-asset.validator";
import { ValidationError } from "@shared/errors/domain/validation.error";
import { zodErrorMapper } from "@shared/helpers/zod-error-mapper";
import { NotFoundError } from "@shared/errors/domain/not-found.error";
import { applyPatch } from "@shared/helpers/apply-patch";
import { AuthorizationError } from "@shared/errors/domain/authorization.error";

@injectable()
export class UpdateAssetUseCase {
	constructor(@inject(TOKENS.AssetRepository) private assetRepository: AssetRepository) {}

	async execute(id: string, userId: string, input: unknown) {
		if (!id || typeof id !== "string") {
			throw new ValidationError("Invalid asset ID", "id");
		}

		if (!userId || typeof userId !== "string") {
			throw new ValidationError("Invalid user ID", "userId");
		}

		const result = UpdateAssetSchema.safeParse(input);
		if (!result.success) {
			throw new ValidationError("Invalid asset data", undefined, undefined, {
				context: { errors: zodErrorMapper(result.error) },
			});
		}

		const data = result.data as Record<string, unknown>;

		const asset = await this.assetRepository.findById(id);
		if (!asset) {
			throw new NotFoundError(`Asset ${id} not found`);
		}

		if (asset.userId !== userId) {
			throw new AuthorizationError("Access denied");
		}

		const patch = applyPatch(asset, data, [
			"symbol",
			"name",
			"asset_type",
			"pricing_source",
			"external_id",
			"quote_currency",
		]);

		if (Object.keys(patch).length === 0) {
			return asset;
		}

		return this.assetRepository.update(id, patch);
	}
}
