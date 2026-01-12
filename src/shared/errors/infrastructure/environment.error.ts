import { BaseError } from "../base/base-error";
import { IErrorMetadata } from "../base/interfaces";
import { ErrorCategory, ErrorSeverity } from "../base/types";

export class EnvironmentError extends BaseError {
	public readonly isOperational = true;

	constructor(
		message: string,
		public readonly originalError?: Error,
		additionalMetadata: Partial<IErrorMetadata> = {},
	) {
		super(500, "ENVIRONMENT_ERROR", message, ErrorSeverity.CRITICAL, ErrorCategory.ENVIRONMENT, {
			...additionalMetadata,
			context: {
				originalError: originalError?.message,
				...additionalMetadata.context,
			},
		});
	}
}
