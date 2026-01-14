import { AssetRepository } from "@modules/assets/domain/asset.repository";
import { TOKENS } from "@shared/container/tokens";
import { inject, injectable } from "tsyringe";
import { CreateAssetSchema } from "../validators/create-asset.validator";
import { ValidationError } from "@shared/errors/domain/validation.error";
import { zodErrorMapper } from "@shared/helpers/zod-error-mapper";
import { AssetType } from "@modules/assets/domain/asset.types";

@injectable()
export class CreateAssetUseCase {
	constructor(@inject(TOKENS.AssetRepository) private assetRepository: AssetRepository) {}

	async execute(userId: string, input: unknown) {
		if (!userId || typeof userId !== "string") {
			throw new ValidationError("Invalid user ID", "userId");
		}

		const result = CreateAssetSchema.safeParse(input);
		if (!result.success) {
			throw new ValidationError("Invalid asset data", undefined, undefined, {
				context: { errors: zodErrorMapper(result.error) },
			});
		}

		const data = result.data;

		return await this.assetRepository.create({
			userId,
			symbol: data.symbol,
			name: data.name,
			asset_type: data.asset_type as AssetType,
			pricing_source: data.pricing_source ?? null,
			external_id: data.external_id ?? null,
			quote_currency: data.quote_currency ?? null,
		});
	}
}
