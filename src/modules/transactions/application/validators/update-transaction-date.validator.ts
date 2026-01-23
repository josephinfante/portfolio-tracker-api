import { z } from "zod";

export const UpdateTransactionDateSchema = z.object({
	transactionDate: z.number().int(),
});

export type UpdateTransactionDateDTO = z.infer<typeof UpdateTransactionDateSchema>;
