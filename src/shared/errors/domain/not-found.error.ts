import { BaseError } from "../base/base-error";
import { IErrorMetadata } from "../base/interfaces";
import { ErrorCategory, ErrorSeverity } from "../base/types";

export class NotFoundError extends BaseError {
	constructor(
		message: string,
		public readonly resource?: string,
		public readonly resourceId?: string,
		additionalMetadata: Partial<IErrorMetadata> = {}
	) {
		super(404, "NOT_FOUND_ERROR", message, ErrorSeverity.LOW, ErrorCategory.NOT_FOUND, {
			...additionalMetadata,
			context: {
				resource,
				resourceId,
				...additionalMetadata.context,
			},
		});
	}
}
