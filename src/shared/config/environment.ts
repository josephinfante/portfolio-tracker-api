import { z } from "zod";
import dotenv from "dotenv";
import { EnvironmentError } from "@shared/errors/infrastructure/environment.error";

dotenv.config();

// Optional extended env types
export type NODE_ENV = "development" | "test" | "staging" | "production";
export type LOG_LEVEL = "debug" | "info" | "warn" | "error";

export interface IEnvironmentVariables {
	PORT: number;
	NODE_ENV: NODE_ENV;
	ACCEPTED_ORIGINS?: string;
	LOG_LEVEL: LOG_LEVEL;
	JWT_SECRET: string;
	DB_URL: string;
	REDIS_URL: string;
}

const environmentSchema = z.object({
	// Coerciones seguras
	PORT: z.coerce.number().min(1).max(65535),
	NODE_ENV: z.enum(["development", "test", "staging", "production"]),
	ACCEPTED_ORIGINS: z.string().optional(),
	LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

	// Validaciones estrictas
	JWT_SECRET: z.string().min(10, "JWT_SECRET must be at least 10 characters"),

	// Validación de URL real
	DB_URL: z
		.string()
		.min(1)
		.refine((v) => {
			try {
				new URL(v);
				return true;
			} catch {
				return false;
			}
		}, "DB_URL must be a valid database URL"),
	REDIS_URL: z
		.string()
		.min(1)
		.refine((v) => {
			try {
				new URL(v);
				return true;
			} catch {
				return false;
			}
		}, "REDIS_URL must be a valid Redis URL"),
});

const result = environmentSchema.safeParse(process.env);

if (!result.success) {
	const issues = result.error.issues;

	console.error("❌ Invalid environment variables", issues);

	throw new EnvironmentError("Invalid environment variables", undefined, {
		context: {
			issues: issues.map((i) => ({
				path: i.path.join("."),
				message: i.message,
			})),
		},
	});
}

export const environment: IEnvironmentVariables = result.data;
