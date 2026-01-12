import { globalRegex } from "@shared/config/global-regex";
import z from "zod";

export const CreateUserSchema = z.object({
	firstName: z.string().min(1, "First name is required"),
	lastName: z.string().min(1, "Last name is required"),

	email: z.string().regex(globalRegex.email, "Invalid email format"),
	password: z
		.string()
		.min(8, "Password must be at least 8 characters long")
		.regex(
			globalRegex.password,
			"Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
		),
});

// Infer schema → CreateUserDTO
export type CreateUserDTO = z.infer<typeof CreateUserSchema>;
