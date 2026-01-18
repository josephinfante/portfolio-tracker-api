import { asyncHandler } from "@bootstrap/helpers/async-handler";
import { ExchangeRateService } from "@modules/exchange-rates/application/exchange-rate.service";
import { Request, Response } from "express";
import { injectable } from "tsyringe";

@injectable()
export class ExchangeRateController {
	constructor(private readonly exchangeRateService: ExchangeRateService) {}

	findAll = asyncHandler(async (req: Request, res: Response) => {
		const userId = res.locals.user.id;
		const response = await this.exchangeRateService.findExchangeRates(userId, req.query);
		return res.status(200).success(response);
	});
}
