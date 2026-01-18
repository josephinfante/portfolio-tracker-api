import { z } from "zod";

export const TransferAssetSchema = z.object({
	fromAccountId: z.string().min(1, "From account is required"),
	toAccountId: z.string().min(1, "To account is required"),
	assetId: z.string().min(1, "Asset is required"),
	quantity: z
		.number()
		.refine((value) => Number.isFinite(value), "Quantity must be a finite number"),
	fee: z
		.object({
			assetId: z.string().min(1, "Fee asset is required"),
			amount: z
				.number()
				.refine((value) => Number.isFinite(value), "Fee amount must be a finite number"),
		})
		.optional(),
	notes: z.string().max(5000, "Notes must be at most 5000 characters").optional(),
	transactionDate: z.number().int().optional(),
});

export type TransferAssetDTO = z.infer<typeof TransferAssetSchema>;
