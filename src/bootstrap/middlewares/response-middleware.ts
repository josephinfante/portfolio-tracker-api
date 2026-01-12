import { NextFunction, Request, Response } from "express";

export function responseMiddleware(req: Request, res: Response, next: NextFunction) {
	res.success = function (data: any = null, meta: any = {}) {
		return res.json({
			success: true,
			data,
			meta,
		});
	};

	next();
}
