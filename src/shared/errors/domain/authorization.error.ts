import { BaseError } from "../base/base-error";
import { IErrorMetadata } from "../base/interfaces";
import { ErrorCategory, ErrorSeverity } from "../base/types";

export class AuthorizationError extends BaseError {
	constructor(
		message: string = "Access denied",
		public readonly requiredPermission?: string,
		additionalMetadata: Partial<IErrorMetadata> = {}
	) {
		super(403, "AUTHORIZATION_ERROR", message, ErrorSeverity.MEDIUM, ErrorCategory.AUTHORIZATION, {
			...additionalMetadata,
			context: {
				requiredPermission,
				...additionalMetadata.context,
			},
		});
	}
}
