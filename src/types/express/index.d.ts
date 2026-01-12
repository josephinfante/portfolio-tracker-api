declare namespace Express {
	export interface Response {
		success: (data?: any, meta?: any) => Response;
	}
}
