import { z } from "zod";

export const UpdateAccountSchema = z.object({
	platformId: z.string().min(1, "Platform is required").optional(),
	name: z.string().min(1, "Name is required").max(100, "Name must be at most 100 characters").optional(),
	currencyCode: z.string().length(3, "Currency code must be 3 characters").optional().nullable(),
});

export type UpdateAccountDTO = z.infer<typeof UpdateAccountSchema>;
