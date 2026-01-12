import { BaseError } from "../base/base-error";
import { ErrorFactory } from "../factories/error.factory";
import { IErrorHandler } from "./interfaces";

export class ErrorHandler implements IErrorHandler {
	constructor(
		private readonly logger?: (error: BaseError) => void,
		private readonly reporter?: (error: BaseError) => void
	) {}

	handle(error: Error, context?: Record<string, unknown>): BaseError {
		const baseError = ErrorFactory.fromNativeError(error, context);

		// Log del error
		if (this.logger) {
			this.logger(baseError);
		}

		// Reportar errores críticos
		if (baseError.shouldReport() && this.reporter) {
			this.reporter(baseError);
		}

		return baseError;
	}
}
