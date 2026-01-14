import { asyncHandler } from "@bootstrap/helpers/async-handler";
import { AssetService } from "@modules/assets/application/asset.service";
import { Request, Response } from "express";
import { injectable } from "tsyringe";

@injectable()
export class AssetController {
	constructor(private readonly assetService: AssetService) {}

	create = asyncHandler(async (req: Request, res: Response) => {
		const userId = res.locals.user.id;
		const response = await this.assetService.createAsset(userId, req.body);
		return res.status(201).success(response);
	});

	list = asyncHandler(async (req: Request, res: Response) => {
		const userId = res.locals.user.id;
		const { meta, ...response } = await this.assetService.listAssets(userId, req.query);
		return res.status(200).success(response, meta);
	});

	findById = asyncHandler(async (req: Request, res: Response) => {
		const userId = res.locals.user.id;
		const id = req.params.id as string;
		const response = await this.assetService.findAsset(id, userId);
		return res.status(200).success(response);
	});

	update = asyncHandler(async (req: Request, res: Response) => {
		const userId = res.locals.user.id;
		const id = req.params.id as string;
		const response = await this.assetService.updateAsset(id, userId, req.body);
		return res.status(200).success(response);
	});

	remove = asyncHandler(async (req: Request, res: Response) => {
		const userId = res.locals.user.id;
		const id = req.params.id as string;
		await this.assetService.deleteAsset(id, userId);
		return res.status(200).success(null);
	});
}
