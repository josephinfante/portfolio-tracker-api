import { AssetPriceRepository } from "@modules/asset-prices/domain/asset-price.repository";
import { CreateAssetPriceInput } from "@modules/asset-prices/domain/asset-price.types";
import { TOKENS } from "@shared/container/tokens";
import { ValidationError } from "@shared/errors/domain/validation.error";
import { inject, injectable } from "tsyringe";

const normalizeCurrencyCode = (value: string) => value.trim().toUpperCase();

@injectable()
export class UpsertAssetPriceUseCase {
	constructor(@inject(TOKENS.AssetPriceRepository) private assetPriceRepository: AssetPriceRepository) {}

	async execute(inputs: CreateAssetPriceInput[]): Promise<void> {
		if (!Array.isArray(inputs) || inputs.length === 0) {
			return;
		}

		const normalized = inputs.map((input) => {
			if (!input || typeof input !== "object") {
				throw new ValidationError("Invalid asset price payload", "assetPrice");
			}

			if (!input.assetId || typeof input.assetId !== "string") {
				throw new ValidationError("Invalid asset ID", "assetId");
			}

			if (!input.quoteCurrency || typeof input.quoteCurrency !== "string") {
				throw new ValidationError("Invalid quote currency", "quoteCurrency");
			}

			if (typeof input.price !== "number" || !Number.isFinite(input.price)) {
				throw new ValidationError("Invalid price", "price");
			}

			if (!input.source || typeof input.source !== "string" || !input.source.trim()) {
				throw new ValidationError("Invalid source", "source");
			}

			if (typeof input.priceAt !== "number" || !Number.isFinite(input.priceAt)) {
				throw new ValidationError("Invalid priceAt", "priceAt");
			}

			return {
				assetId: input.assetId,
				quoteCurrency: normalizeCurrencyCode(input.quoteCurrency),
				price: input.price,
				source: input.source.trim(),
				priceAt: input.priceAt,
			};
		});

		await this.assetPriceRepository.upsertMany(normalized);
	}
}
