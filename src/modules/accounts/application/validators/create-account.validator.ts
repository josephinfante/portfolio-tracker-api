import { z } from "zod";

export const CreateAccountSchema = z.object({
	platformId: z.string().min(1, "Platform is required"),
	name: z.string().min(1, "Name is required").max(100, "Name must be at most 100 characters"),
	currencyCode: z.string().length(3, "Currency code must be 3 characters"),
});

export type CreateAccountDTO = z.infer<typeof CreateAccountSchema>;
