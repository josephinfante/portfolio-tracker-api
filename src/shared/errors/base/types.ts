export enum ErrorSeverity {
	LOW = "low",
	MEDIUM = "medium",
	HIGH = "high",
	CRITICAL = "critical",
}

export enum ErrorCategory {
	VALIDATION = "validation",
	AUTHENTICATION = "authentication",
	AUTHORIZATION = "authorization",
	NOT_FOUND = "not_found",
	CONFLICT = "conflict",
	BUSINESS_LOGIC = "business_logic",
	EXTERNAL_SERVICE = "external_service",
	SYSTEM = "system",
	NETWORK = "network",
	DATABASE = "database",
	ENVIRONMENT = "environment",
}
