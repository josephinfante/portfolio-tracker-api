import { BaseError } from "../base/base-error";
import { IErrorMetadata } from "../base/interfaces";
import { NotFoundError } from "../domain/not-found.error";
import { ValidationError } from "../domain/validation.error";
import { DatabaseError } from "../infrastructure/database.error";
import { SystemError } from "../infrastructure/system.error";

export class ErrorFactory {
	/**
	 * Crea un error desde un error nativo de JavaScript
	 */
	static fromNativeError(error: Error, context?: Record<string, unknown>): BaseError {
		if (error instanceof BaseError) {
			return error;
		}

		// Mapeo de errores comunes
		if (error.name === "ValidationError") {
			return new ValidationError(error.message, undefined, undefined, { context });
		}

		if (error.name === "MongoError" || error.name === "SequelizeError") {
			return new DatabaseError(error.message, undefined, error, { context });
		}

		// Error genérico del sistema
		return new SystemError(error.message, error, { context });
	}

	/**
	 * Crea un error de validación con múltiples campos
	 */
	static createValidationError(
		fields: Array<{ field: string; message: string; value?: unknown }>,
		additionalMetadata: Partial<IErrorMetadata> = {}
	): ValidationError {
		const messages = fields.map((f) => `${f.field}: ${f.message}`).join(", ");
		return new ValidationError(`Validation failed: ${messages}`, undefined, undefined, {
			...additionalMetadata,
			context: {
				fields,
				...additionalMetadata.context,
			},
		});
	}

	/**
	 * Crea un error no encontrado para un recurso específico
	 */
	static createNotFoundError(
		resource: string,
		id: string,
		additionalMetadata: Partial<IErrorMetadata> = {}
	): NotFoundError {
		return new NotFoundError(`${resource} with ID '${id}' not found`, resource, id, additionalMetadata);
	}

	/**
	 * Crea un error encadenado simple (mantiene compatibilidad con ErrorUtils)
	 */
	static chainError(originalError: Error, newError: BaseError): BaseError {
		const updatedMetadata: IErrorMetadata = {
			...newError.metadata,
			context: {
				...newError.metadata.context,
				originalError: originalError.message,
				originalStack: originalError.stack,
				originalName: originalError.name,
			},
		};

		Object.defineProperty(newError, "metadata", {
			value: updatedMetadata,
			writable: false,
			enumerable: true,
			configurable: false,
		});

		return newError;
	}
}
