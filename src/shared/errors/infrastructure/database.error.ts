import { BaseError } from "../base/base-error";
import { IErrorMetadata } from "../base/interfaces";
import { ErrorCategory, ErrorSeverity } from "../base/types";

export class DatabaseError extends BaseError {
	constructor(
		message: string,
		public readonly operation?: string,
		public readonly originalError?: Error,
		additionalMetadata: Partial<IErrorMetadata> = {}
	) {
		super(500, "DATABASE_ERROR", message, ErrorSeverity.HIGH, ErrorCategory.DATABASE, {
			...additionalMetadata,
			context: {
				operation,
				originalError: originalError?.message,
				...additionalMetadata.context,
			},
		});
	}
}
