import { environment } from "@shared/config/environment";
import cors from "cors";

const rawOrigins = environment.ACCEPTED_ORIGINS;
const ACCEPTED_ORIGINS =
	typeof rawOrigins === "string"
		? rawOrigins.split(",").map((o) => o.trim())
		: Array.isArray(rawOrigins)
			? rawOrigins
			: [];

export const corsMiddleware = cors({
	origin: (origin, callback) => {
		if (!origin) return callback(null, true);
		if (ACCEPTED_ORIGINS.includes(origin)) {
			callback(null, true);
			return;
		}
		callback(new Error("Not allowed by CORS"));
	},
	credentials: true,
});
