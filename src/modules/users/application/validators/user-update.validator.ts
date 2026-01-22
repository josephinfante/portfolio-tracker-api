import { globalRegex } from "@shared/config/global-regex";
import { z } from "zod";

export const UpdateUserSchema = z.object({
	firstName: z.string().min(1, "First name is required").optional(),
	lastName: z.string().min(1, "Last name is required").optional(),
	email: z.string().regex(globalRegex.email, "Invalid email format").optional(),
	baseCurrency: z.string().length(3, "Base currency must be 3 characters").optional(),
	timeZone: z.string().min(1, "Time zone is required").optional(),
	oldPassword: z.string().min(8, "Old password must be at least 8 characters long").optional(),
	newPassword: z
		.string()
		.min(8, "New password must be at least 8 characters long")
		.regex(
			globalRegex.password,
			"New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
		)
		.optional(),
});

export type UpdateUserDTO = z.infer<typeof UpdateUserSchema>;
