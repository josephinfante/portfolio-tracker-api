import { z } from "zod";
import { AssetType } from "@modules/assets/domain/asset.types";

const assetTypeValues = Object.values(AssetType) as [string, ...string[]];

export const CreateAssetSchema = z.object({
	symbol: z.string().min(1, "Symbol is required").max(100, "Symbol must be at most 100 characters"),
	name: z.string().min(1, "Name is required").max(100, "Name must be at most 100 characters"),
	asset_type: z.enum(assetTypeValues),
	pricing_source: z.string().max(100, "Pricing source must be at most 100 characters").nullable().optional(),
	external_id: z.string().max(100, "External ID must be at most 100 characters").nullable().optional(),
	quote_currency: z.string().max(100, "Quote currency must be at most 100 characters").nullable().optional(),
});

export type CreateAssetDTO = z.infer<typeof CreateAssetSchema>;
