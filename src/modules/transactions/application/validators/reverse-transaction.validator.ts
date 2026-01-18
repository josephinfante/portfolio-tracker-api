import { z } from "zod";

export const ReverseTransactionSchema = z.object({
	reason: z.string().max(5000, "Reason must be at most 5000 characters").nullable().optional(),
});

export type ReverseTransactionDTO = z.infer<typeof ReverseTransactionSchema>;
