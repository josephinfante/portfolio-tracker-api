import { asyncHandler } from "@bootstrap/helpers/async-handler";
import { GetAssetAllocationUseCase } from "@modules/portfolio-snapshots/application/usecases/get-asset-allocation.usecase";
import { Request, Response } from "express";
import { injectable } from "tsyringe";

@injectable()
export class AllocationController {
	constructor(private readonly getAssetAllocationUseCase: GetAssetAllocationUseCase) {}

	getAssets = asyncHandler(async (req: Request, res: Response) => {
		const userId = res.locals.user.id;
		const response = await this.getAssetAllocationUseCase.execute(userId, req.query);
		return res.status(200).success(response);
	});
}
