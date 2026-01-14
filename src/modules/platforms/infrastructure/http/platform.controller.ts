import { asyncHandler } from "@bootstrap/helpers/async-handler";
import { PlatformService } from "@modules/platforms/application/platform.service";
import { Request, Response } from "express";
import { injectable } from "tsyringe";

@injectable()
export class PlatformController {
	constructor(private readonly platformService: PlatformService) {}

	create = asyncHandler(async (req: Request, res: Response) => {
		const userId = res.locals.user.id;
		const response = await this.platformService.createPlatform(userId, req.body);
		return res.status(201).success(response);
	});

	list = asyncHandler(async (req: Request, res: Response) => {
		const userId = res.locals.user.id;
		const { meta, ...response } = await this.platformService.listPlatforms(userId, req.query);
		return res.status(200).success(response, meta);
	});

	findById = asyncHandler(async (req: Request, res: Response) => {
		const userId = res.locals.user.id;
		const id = req.params.id as string;
		const response = await this.platformService.findPlatform(id, userId);
		return res.status(200).success(response);
	});

	update = asyncHandler(async (req: Request, res: Response) => {
		const userId = res.locals.user.id;
		const id = req.params.id as string;
		const response = await this.platformService.updatePlatform(id, userId, req.body);
		return res.status(200).success(response);
	});

	remove = asyncHandler(async (req: Request, res: Response) => {
		const userId = res.locals.user.id;
		const id = req.params.id as string;
		await this.platformService.deletePlatform(id, userId);
		return res.status(200).success(null);
	});
}
