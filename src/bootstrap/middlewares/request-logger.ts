import { logger } from "@shared/logger";
import { randomUUID } from "crypto";
import { NextFunction, Request, Response } from "express";

export function requestLogger(req: Request, res: Response, next: NextFunction) {
	const requestId = randomUUID();
	req.headers["x-request-id"] = requestId;

	const start = Date.now();

	res.on("finish", () => {
		const duration = Date.now() - start;

		logger.info(
			{
				requestId,
				method: req.method,
				url: req.originalUrl,
				status: res.statusCode,
				durationMs: duration,
				clientIp: req.ip,
				userAgent: req.headers["user-agent"] || "",
			},
			"HTTP Request Completed",
		);
	});

	next();
}
