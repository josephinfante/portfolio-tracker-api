import { z } from "zod";
import { AssetType } from "@modules/assets/domain/asset.types";

const assetTypeValues = Object.values(AssetType) as [string, ...string[]];

export const UpdateAssetSchema = z.object({
	symbol: z.string().min(1, "Symbol is required").max(100, "Symbol must be at most 100 characters").optional(),
	name: z.string().min(1, "Name is required").max(100, "Name must be at most 100 characters").optional(),
	asset_type: z.enum(assetTypeValues).optional(),
	pricing_source: z.string().max(100, "Pricing source must be at most 100 characters").nullable().optional(),
	external_id: z.string().max(100, "External ID must be at most 100 characters").nullable().optional(),
	quote_currency: z.string().max(100, "Quote currency must be at most 100 characters").nullable().optional(),
});

export type UpdateAssetDTO = z.infer<typeof UpdateAssetSchema>;
