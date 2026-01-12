import helmet from "helmet";

export const helmetMiddleware = helmet({
	contentSecurityPolicy: false, // si no sirves views
	frameguard: { action: "deny" },
	referrerPolicy: { policy: "no-referrer" },
	xssFilter: true,
	hidePoweredBy: true,
	hsts: {
		maxAge: 63072000,
		includeSubDomains: true,
		preload: true,
	},
});
