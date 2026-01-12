import { BaseError } from "../base/base-error";
import { IErrorMetadata } from "../base/interfaces";
import { ErrorCategory, ErrorSeverity } from "../base/types";

export class SystemError extends BaseError {
	public readonly isOperational = false; // Los errores del sistema no son operacionales

	constructor(
		message: string,
		public readonly originalError?: Error,
		additionalMetadata: Partial<IErrorMetadata> = {}
	) {
		super(500, "SYSTEM_ERROR", message, ErrorSeverity.CRITICAL, ErrorCategory.SYSTEM, {
			...additionalMetadata,
			context: {
				originalError: originalError?.message,
				...additionalMetadata.context,
			},
		});
	}
}
