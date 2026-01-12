import { BaseError } from "../base/base-error";
import { IErrorMetadata } from "../base/interfaces";
import { ErrorCategory, ErrorSeverity } from "../base/types";

export class BusinessLogicError extends BaseError {
	constructor(
		message: string,
		code: string = "BUSINESS_LOGIC_ERROR",
		additionalMetadata: Partial<IErrorMetadata> = {}
	) {
		super(422, code, message, ErrorSeverity.MEDIUM, ErrorCategory.BUSINESS_LOGIC, additionalMetadata);
	}
}
