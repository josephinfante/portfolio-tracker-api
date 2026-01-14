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

export const CreatePlatformSchema = z.object({
	name: z.string().min(1, "Name is required").max(100, "Name must be at most 100 characters"),
	type: z.enum(platformTypeValues),
	country: z.string().length(2, "Country must be 2 characters"),
});

export type CreatePlatformDTO = z.infer<typeof CreatePlatformSchema>;
