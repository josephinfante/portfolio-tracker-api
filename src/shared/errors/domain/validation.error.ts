import { BaseError } from "../base/base-error";
import { IErrorMetadata } from "../base/interfaces";
import { ErrorCategory, ErrorSeverity } from "../base/types";

export class ValidationError extends BaseError {
	constructor(
		message: string,
		public readonly field?: string,
		public readonly value?: unknown,
		additionalMetadata: Partial<IErrorMetadata> = {}
	) {
		super(400, "VALIDATION_ERROR", message, ErrorSeverity.LOW, ErrorCategory.VALIDATION, {
			...additionalMetadata,
			context: {
				field,
				value,
				...additionalMetadata.context,
			},
		});
	}
}
