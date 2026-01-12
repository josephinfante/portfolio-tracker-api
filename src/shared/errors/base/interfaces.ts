export interface IErrorMetadata {
	readonly timestamp: Date;
	readonly correlationId?: string;
	readonly userId?: string;
	readonly context?: Record<string, unknown>;
	readonly stack?: string;
}

export interface ISerializableError {
	readonly name: string;
	readonly message: string;
	readonly statusCode: number;
	readonly code: string;
	readonly metadata: IErrorMetadata;
	readonly isOperational: boolean;
}
