import { environment } from "@shared/config/environment";
import pino from "pino";

export const pinoConfig = pino({
	transport:
		environment.NODE_ENV !== "production"
			? {
					target: "pino-pretty",
					options: {
						colorize: true,
						translateTime: "SYS:standard",
						ignore: "pid,hostname",
					},
				}
			: undefined,

	level: environment.LOG_LEVEL || "info",

	base: {
		service: "kontistream-api",
	},
});
