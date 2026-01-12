import z from "zod";

export function zodErrorMapper(error: z.ZodError) {
	return error.issues.map((issue) => ({
		field: issue.path.join("."),
		message: issue.message,
		code: issue.code,
	}));
}
