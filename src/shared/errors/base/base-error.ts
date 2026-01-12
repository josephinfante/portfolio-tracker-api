import { IErrorMetadata, ISerializableError } from "./interfaces";
import { ErrorCategory, ErrorSeverity } from "./types";

export abstract class BaseError extends Error implements ISerializableError {
	public readonly timestamp: Date;
	public readonly isOperational: boolean = true;
	public readonly metadata: IErrorMetadata;

	constructor(
		public readonly statusCode: number,
		public readonly code: string,
		message: string,
		public readonly severity: ErrorSeverity = ErrorSeverity.MEDIUM,
		public readonly category: ErrorCategory,
		additionalMetadata: Partial<IErrorMetadata> = {}
	) {
		super(message);

		this.name = new.target.name;
		this.timestamp = new Date();

		// Capturar stack trace excluyendo el constructor
		Error.captureStackTrace(this, new.target);

		// Enriquecer metadata
		this.metadata = {
			...additionalMetadata,
			timestamp: this.timestamp,
			stack: this.stack,
			correlationId: additionalMetadata.correlationId,
			userId: additionalMetadata.userId,
			context: additionalMetadata.context,
		};
	}

	/**
	 * Serializa el error para logging o respuestas API
	 */
	public toJSON(): ISerializableError {
		return {
			name: this.name,
			message: this.message,
			statusCode: this.statusCode,
			code: this.code,
			metadata: this.metadata as IErrorMetadata,
			isOperational: this.isOperational,
		};
	}

	/**
	 * Crea una representación para cliente (sin información sensible)
	 */
	public toClientSafe(): Partial<ISerializableError> {
		return {
			name: this.name,
			message: this.message,
			statusCode: this.statusCode,
			code: this.code,
		};
	}

	/**
	 * Verifica si el error es crítico
	 */
	public isCritical(): boolean {
		return this.severity === ErrorSeverity.CRITICAL || this.severity === ErrorSeverity.HIGH;
	}

	/**
	 * Verifica si debe ser reportado a sistemas de monitoreo
	 */
	public shouldReport(): boolean {
		return this.isOperational && this.isCritical();
	}
}
