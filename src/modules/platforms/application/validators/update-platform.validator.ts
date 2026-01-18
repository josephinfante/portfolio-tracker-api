import { z } from "zod";

const platformTypeValues = [
	"exchange",
	"bank",
	"broker",
	"wallet",
	"yield_platform",
	"payment_processor",
	"custodian",
	"fund",
	"other",
] as any;

export const UpdatePlatformSchema = z.object({
	name: z.string().min(1, "Name is required").max(100, "Name must be at most 100 characters").optional(),
	type: z.enum(platformTypeValues).optional(),
	country: z.string().length(2, "Country must be 2 characters").optional(),
});

export type UpdatePlatformDTO = z.infer<typeof UpdatePlatformSchema>;
