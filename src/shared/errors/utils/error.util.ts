import { BaseError } from "../base/base-error";

export const ErrorUtils = {
	/**
	 * Verifica si un error es operacional
	 */
	isOperationalError(error: Error): boolean {
		return error instanceof BaseError ? error.isOperational : false;
	},

	/**
	 * Extrae el código de error
	 */
	getErrorCode(error: Error): string {
		return error instanceof BaseError ? error.code : "UNKNOWN_ERROR";
	},

	/**
	 * Extrae el status code HTTP
	 */
	getStatusCode(error: Error): number {
		return error instanceof BaseError ? error.statusCode : 500;
	},
};
