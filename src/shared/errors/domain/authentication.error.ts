import { BaseError } from "../base/base-error";
import { IErrorMetadata } from "../base/interfaces";
import { ErrorCategory, ErrorSeverity } from "../base/types";

export class AuthenticationError extends BaseError {
	constructor(message: string = "Authentication failed", additionalMetadata: Partial<IErrorMetadata> = {}) {
		super(401, "AUTHENTICATION_ERROR", message, ErrorSeverity.MEDIUM, ErrorCategory.AUTHENTICATION, additionalMetadata);
	}
}
