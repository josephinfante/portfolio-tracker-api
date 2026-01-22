import { asyncHandler } from "@bootstrap/helpers/async-handler";
import { PortfolioSnapshotService } from "@modules/portfolio-snapshots/application/portfolio-snapshot.service";
import { Request, Response } from "express";
import { injectable } from "tsyringe";

@injectable()
export class PerformanceController {
	constructor(private readonly portfolioSnapshotService: PortfolioSnapshotService) {}

	getPerformance = asyncHandler(async (req: Request, res: Response) => {
		const userId = res.locals.user.id;
		const response = await this.portfolioSnapshotService.getPerformance(userId, req.query);
		return res.status(200).success(response);
	});
}
