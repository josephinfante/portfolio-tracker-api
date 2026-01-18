import { environment } from "@shared/config/environment";
import { BaseError } from "@shared/errors/base/base-error";
import { ErrorFactory } from "@shared/errors/factories/error.factory";
import { logger } from "@shared/logger";
import { NextFunction, Request, Response } from "express";

export function errorMiddleware(err: Error, req: Request, res: Response, next: NextFunction) {
	/**
	 * Convertimos cualquier error a BaseError
	 */
	const baseError: BaseError = ErrorFactory.fromNativeError(err, {
		correlationId: req.headers["x-request-id"],
		method: req.method,
		url: req.originalUrl,
		body: req.body,
		params: req.params,
		query: req.query,
	});

	/**
	 * Logging (siempre)
	 */
	logger.error(
		{
			...baseError.toJSON(),
		},
		`[${baseError.code}] ${baseError.message}`,
	);

	/**
	 * En desarrollo mostramos el error completo (ayuda a debug)
	 */
	if (environment.NODE_ENV === "development") {
		const safeResponse = baseError.toDevelopSafe();
		return res.status(baseError.statusCode).json({
			success: false,
			error: {
				...safeResponse,
			},
		});
	}

	/**
	 * Respuesta segura para el cliente (no exponemos stack ni metadata)
	 */
	const safeResponse = baseError.toClientSafe();

	/**
	 * En producción NO mostramos metadata
	 */
	return res.status(baseError.statusCode).json({
		success: false,
		error: safeResponse,
	});
}
