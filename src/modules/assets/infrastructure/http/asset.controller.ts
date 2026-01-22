import { asyncHandler } from "@bootstrap/helpers/async-handler";
import { AssetService } from "@modules/assets/application/asset.service";
import { ValidationError } from "@shared/errors/domain/validation.error";
import { Request, Response } from "express";
import { injectable } from "tsyringe";

const UUID_REGEX = /^[0-9a-fA-F-]{36}$/;
const QUOTE_CURRENCY_REGEX = /^[A-Za-z]{3}$/;
const DEFAULT_TX_LIMIT = 5;
const MAX_TX_LIMIT = 50;

@injectable()
export class AssetController {
	constructor(private readonly assetService: AssetService) {}

	create = asyncHandler(async (req: Request, res: Response) => {
		const response = await this.assetService.createAsset(req.body);
		return res.status(201).success(response);
	});

	list = asyncHandler(async (req: Request, res: Response) => {
		const { meta, ...response } = await this.assetService.listAssets(req.query);
		return res.status(200).success(response, meta);
	});

	findById = asyncHandler(async (req: Request, res: Response) => {
		const id = req.params.id as string;
		const response = await this.assetService.findAsset(id);
		return res.status(200).success(response);
	});

	getAssetDetails = asyncHandler(async (req: Request, res: Response) => {
		const userId = res.locals.user.id;
		const id = req.params.id as string;

		if (!UUID_REGEX.test(id)) {
			throw new ValidationError("Invalid asset ID", "id", id);
		}

		const rawQuote = req.query.quoteCurrency;
		if (rawQuote !== undefined && typeof rawQuote !== "string") {
			throw new ValidationError("Invalid quote currency", "quoteCurrency", rawQuote);
		}
		const quoteCurrency = typeof rawQuote === "string" && rawQuote.trim().length ? rawQuote.trim().toUpperCase() : "USD";
		if (!quoteCurrency || !QUOTE_CURRENCY_REGEX.test(quoteCurrency)) {
			throw new ValidationError("Invalid quote currency", "quoteCurrency", rawQuote);
		}

		const rawLimit = req.query.txLimit;
		const parsedLimit = typeof rawLimit === "string" ? Number(rawLimit) : rawLimit;
		const txLimit =
			parsedLimit === undefined
				? DEFAULT_TX_LIMIT
				: Number.isFinite(parsedLimit) && parsedLimit > 0 && parsedLimit <= MAX_TX_LIMIT
					? parsedLimit
					: undefined;

		if (txLimit === undefined) {
			throw new ValidationError("Invalid transaction limit", "txLimit", rawLimit);
		}

		const response = await this.assetService.getAssetDetails(userId, id, { quoteCurrency, txLimit });
		return res.status(200).success(response);
	});

	update = asyncHandler(async (req: Request, res: Response) => {
		const id = req.params.id as string;
		const response = await this.assetService.updateAsset(id, req.body);
		return res.status(200).success(response);
	});

	remove = asyncHandler(async (req: Request, res: Response) => {
		const id = req.params.id as string;
		await this.assetService.deleteAsset(id);
		return res.status(200).success(null);
	});
}
