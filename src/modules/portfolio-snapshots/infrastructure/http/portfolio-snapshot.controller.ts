import { asyncHandler } from "@bootstrap/helpers/async-handler";
import { PortfolioSnapshotService } from "@modules/portfolio-snapshots/application/portfolio-snapshot.service";
import { Request, Response } from "express";
import { injectable } from "tsyringe";

@injectable()
export class PortfolioSnapshotController {
	constructor(private readonly portfolioSnapshotService: PortfolioSnapshotService) {}

	createToday = asyncHandler(async (req: Request, res: Response) => {
		const userId = res.locals.user.id;
		const timeZone =
			typeof req.body?.timeZone === "string"
				? req.body.timeZone
				: typeof req.query?.timeZone === "string"
					? req.query.timeZone
					: undefined;
		const response = await this.portfolioSnapshotService.createTodaySnapshot(userId, timeZone);
		return res.status(201).success(response);
	});

	list = asyncHandler(async (req: Request, res: Response) => {
		const userId = res.locals.user.id;
		const { meta, ...response } = await this.portfolioSnapshotService.findSnapshots(userId, req.query);
		return res.status(200).success(response, meta);
	});

	findById = asyncHandler(async (req: Request, res: Response) => {
		const userId = res.locals.user.id;
		const snapshotId = req.params.id as string;
		const response = await this.portfolioSnapshotService.findSnapshotById(userId, snapshotId);
		return res.status(200).success(response);
	});
}
