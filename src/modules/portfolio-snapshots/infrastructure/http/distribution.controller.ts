import { asyncHandler } from "@bootstrap/helpers/async-handler";
import { GetPlatformDistributionUseCase } from "@modules/portfolio-snapshots/application/usecases/get-platform-distribution.usecase";
import { Request, Response } from "express";
import { injectable } from "tsyringe";

@injectable()
export class DistributionController {
	constructor(private readonly getPlatformDistributionUseCase: GetPlatformDistributionUseCase) {}

	getPlatforms = asyncHandler(async (req: Request, res: Response) => {
		const userId = res.locals.user.id;
		const response = await this.getPlatformDistributionUseCase.execute(userId, req.query);
		return res.status(200).success(response);
	});
}
