import { BaseError } from "../base/base-error";

export interface IErrorHandler {
	handle(error: Error, context?: Record<string, unknown>): BaseError;
}
