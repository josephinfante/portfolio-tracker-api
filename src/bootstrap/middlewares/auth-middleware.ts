import { TokenService } from "@modules/auth/application/services/token.service";
import { TOKENS } from "@shared/container/tokens";
import { AuthenticationError } from "@shared/errors/domain/authentication.error";
import { NextFunction, Request, Response } from "express";
import { container } from "tsyringe";

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
	const header = req.headers.authorization;

	if (!header || !header.startsWith("Bearer ")) {
		return next(new AuthenticationError("Missing or invalid authorization header"));
	}

	const token = header.replace("Bearer ", "").trim();

	const tokenService = container.resolve<TokenService>(TOKENS.TokenService);

	const verified = await tokenService.verify(token);

	if (!verified || verified.payload.valid === false) {
		return next(new AuthenticationError("Unauthorized access"));
	}

	res.locals.user = {
		id: verified.payload.sub,
		email: verified.payload.email,
	};

	return next();
};
