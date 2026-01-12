import { BaseError } from "../base/base-error";
import { IErrorMetadata } from "../base/interfaces";
import { ErrorCategory, ErrorSeverity } from "../base/types";

export class ConflictError extends BaseError {
	constructor(
		message: string,
		public readonly conflictingResource?: string,
		additionalMetadata: Partial<IErrorMetadata> = {}
	) {
		super(409, "CONFLICT_ERROR", message, ErrorSeverity.MEDIUM, ErrorCategory.CONFLICT, {
			...additionalMetadata,
			context: {
				conflictingResource,
				...additionalMetadata.context,
			},
		});
	}
}
