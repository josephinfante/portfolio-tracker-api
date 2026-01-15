import { z } from "zod";

export const ExchangeAssetSchema = z.object({
	fromAccountId: z.string().min(1, "From account is required"),
	toAccountId: z.string().min(1, "To account is required"),
	fromAssetId: z.string().min(1, "From asset is required"),
	toAssetId: z.string().min(1, "To asset is required"),
	fromQuantity: z
		.number()
		.refine((value) => Number.isFinite(value), "From quantity must be a finite number"),
	toQuantity: z
		.number()
		.refine((value) => Number.isFinite(value), "To quantity must be a finite number"),
	price: z.number().refine((value) => Number.isFinite(value), "Price must be a finite number").optional(),
	exchangeRate: z
		.number()
		.refine((value) => Number.isFinite(value), "Exchange rate must be a finite number")
		.optional(),
	fee: z
		.object({
			assetId: z.string().min(1, "Fee asset is required"),
			amount: z.number().refine((value) => Number.isFinite(value), "Fee amount must be a finite number"),
		})
		.optional(),
	notes: z.string().max(5000, "Notes must be at most 5000 characters").optional(),
	transactionDate: z.number().int().optional(),
});

export type ExchangeAssetDTO = z.infer<typeof ExchangeAssetSchema>;
