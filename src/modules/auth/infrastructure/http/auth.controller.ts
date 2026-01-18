import { asyncHandler } from "@bootstrap/helpers/async-handler";
import { AuthService } from "@modules/auth/application/services/auth.service";
import { Request, Response } from "express";
import { injectable } from "tsyringe";

@injectable()
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	signUp = asyncHandler(async (req: Request, res: Response) => {
		const response = await this.authService.signUp(req.body);
		return res.status(201).success(response);
	});

	signIn = asyncHandler(async (req: Request, res: Response) => {
		const { email, password } = req.body;
		const response = await this.authService.signIn(email, password);
		return res.status(200).success(response);
	});
}
