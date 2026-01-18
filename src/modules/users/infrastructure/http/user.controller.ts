import { asyncHandler } from "@bootstrap/helpers/async-handler";
import { UserService } from "@modules/users/application/user.service";
import { Request, Response } from "express";
import { injectable } from "tsyringe";

@injectable()
export class UserController {
	constructor(private readonly userService: UserService) {}

	update = asyncHandler(async (req: Request, res: Response) => {
		const userId = res.locals.user.id;
		const response = await this.userService.updateUser(userId, req.body);
		return res.status(200).success(response);
	});

	findById = asyncHandler(async (_req: Request, res: Response) => {
		const userId = res.locals.user.id;
		const response = await this.userService.find(userId);
		return res.status(200).success(response);
	});
}
