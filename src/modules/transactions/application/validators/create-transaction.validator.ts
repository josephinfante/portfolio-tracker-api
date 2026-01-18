import { z } from "zod";

export const CreateTransactionSchema = z.object({
	accountId: z.string().min(1, "Account is required"),
	assetId: z.string().min(1, "Asset is required"),
	transactionType: z.string().min(1, "Transaction type is required"),
	correctionType: z.string().min(1, "Correction type is required").nullable().optional(),
	referenceTxId: z.string().min(1, "Reference transaction is required").nullable().optional(),
	quantity: z.number().refine((value) => Number.isFinite(value), "Quantity must be a finite number"),
	unitPrice: z
		.number()
		.refine((value) => Number.isFinite(value), "Unit price must be a finite number")
		.nullable()
		.optional(),
	currencyCode: z.string().length(3, "Currency code must be 3 characters"),
	exchangeRate: z
		.number()
		.refine((value) => Number.isFinite(value), "Exchange rate must be a finite number")
		.nullable()
		.optional(),
	transactionDate: z.number().int(),
	notes: z.string().max(5000, "Notes must be at most 5000 characters").nullable().optional(),
	fee: z
		.object({
			assetId: z.string().min(1, "Fee asset is required"),
			quantity: z.number().refine((value) => Number.isFinite(value), "Fee quantity must be a finite number"),
		})
		.optional(),
});

export type CreateTransactionDTO = z.infer<typeof CreateTransactionSchema>;
