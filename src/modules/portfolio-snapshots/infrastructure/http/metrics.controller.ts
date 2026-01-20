import { asyncHandler } from "@bootstrap/helpers/async-handler";
import { PortfolioSnapshotService } from "@modules/portfolio-snapshots/application/portfolio-snapshot.service";
import { Request, Response } from "express";
import { injectable } from "tsyringe";

@injectable()
export class MetricsController {
	constructor(private readonly portfolioSnapshotService: PortfolioSnapshotService) {}

	getMetrics = asyncHandler(async (req: Request, res: Response) => {
		const userId = res.locals.user.id;
		const timeZone = typeof req.query?.timeZone === "string" ? req.query.timeZone : undefined;
		const response = await this.portfolioSnapshotService.getMetrics(userId, timeZone);
		return res.status(200).success(response);
	});
}
