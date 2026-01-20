import { z } from "zod";

export const AdjustTransactionSchema = z.object({
	correctionType: z.string().min(1, "Correction type is required").nullable(),
	quantity: z
		.number()
		.refine((value) => Number.isFinite(value), "Quantity must be a finite number")
		.optional(),
	paymentAssetId: z.string().min(1, "Payment asset is required").optional(),
	paymentQuantity: z
		.number()
		.refine((value) => Number.isFinite(value), "Payment quantity must be a finite number")
		.optional(),
	exchangeRate: z
		.number()
		.refine((value) => Number.isFinite(value), "Exchange rate must be a finite number")
		.nullable()
		.optional(),
	transactionDate: z.number().int().optional(),
	notes: z.string().max(5000, "Notes must be at most 5000 characters").nullable().optional(),
	reason: z.string().max(5000, "Reason must be at most 5000 characters").nullable().optional(),
});

export type AdjustTransactionDTO = z.infer<typeof AdjustTransactionSchema>;
