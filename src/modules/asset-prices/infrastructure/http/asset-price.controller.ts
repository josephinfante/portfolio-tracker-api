import { asyncHandler } from "@bootstrap/helpers/async-handler";
import { AssetPriceService } from "@modules/asset-prices/application/asset-price.service";
import { Request, Response } from "express";
import { injectable } from "tsyringe";

@injectable()
export class AssetPriceController {
	constructor(private readonly assetPriceService: AssetPriceService) {}

	getRange = asyncHandler(async (req: Request, res: Response) => {
		const asset = req.query.asset as string;
		const startAt = req.query.startAt as string | undefined;
		const endAt = req.query.endAt as string | undefined;

		const response = await this.assetPriceService.getAssetPriceRange(
			asset,
			startAt ? Number(startAt) : undefined,
			endAt ? Number(endAt) : undefined,
		);

		return res.status(200).success(response);
	});

	getLivePrice = asyncHandler(async (req: Request, res: Response) => {
		const rawAssets = req.query.assets;
		const assets = Array.isArray(rawAssets)
			? rawAssets.map((value) => value.toString())
			: typeof rawAssets === "string"
				? rawAssets.split(",")
				: [];

		const response = await this.assetPriceService.getAssetLivePrice(assets);
		return res.status(200).success(response);
	});

	sync = asyncHandler(async (_req: Request, res: Response) => {
		const payloads = await this.assetPriceService.syncAssetPrices();
		if (!payloads.length) {
			return res.status(200).success({ synced: 0 });
		}

		await this.assetPriceService.upsertAssetPrices(payloads);
		return res.status(200).success({ synced: payloads });
	});
}
