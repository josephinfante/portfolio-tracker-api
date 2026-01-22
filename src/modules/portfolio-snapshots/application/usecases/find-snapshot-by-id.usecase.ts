import {
	PortfolioSnapshotRepository,
	SnapshotItemDetail,
} from "@modules/portfolio-snapshots/domain/portfolio-snapshot.repository";
import { SnapshotDetail } from "@modules/portfolio-snapshots/domain/portfolio-snapshot.entity";
import { TOKENS } from "@shared/container/tokens";
import { NotFoundError } from "@shared/errors/domain/not-found.error";
import { ValidationError } from "@shared/errors/domain/validation.error";
import { inject, injectable } from "tsyringe";

type PlatformGroup = {
	id: string;
	name: string;
	type: string;
	accounts: Array<{
		id: string;
		name: string;
		currencyCode: string | null;
		assets: Array<{
			id: string;
			symbol: string;
			name: string;
			asset_type: string;
			quantity: number;
			priceUsd: number;
			priceBase: number;
			valueUsd: number;
			valueBase: number;
		}>;
	}>;
};

const buildPlatforms = (items: SnapshotItemDetail[]): PlatformGroup[] => {
	const platformMap = new Map<string, PlatformGroup>();
	const accountMaps = new Map<string, Map<string, PlatformGroup["accounts"][number]>>();

	for (const item of items) {
		let platform = platformMap.get(item.platformId);
		if (!platform) {
			platform = {
				id: item.platformId,
				name: item.platformName,
				type: item.platformType,
				accounts: [],
			};
			platformMap.set(item.platformId, platform);
			accountMaps.set(item.platformId, new Map());
		}

		const platformAccountMap = accountMaps.get(item.platformId)!;
		let account = platformAccountMap.get(item.accountId);
		if (!account) {
			account = {
				id: item.accountId,
				name: item.accountName,
				currencyCode: item.accountCurrencyCode,
				assets: [],
			};
			platformAccountMap.set(item.accountId, account);
			platform.accounts.push(account);
		}

		account.assets.push({
			id: item.assetId,
			symbol: item.assetSymbol,
			name: item.assetName,
			asset_type: item.assetType,
			quantity: item.quantity,
			priceUsd: item.priceUsd,
			priceBase: item.priceBase,
			valueUsd: item.valueUsd,
			valueBase: item.valueBase,
		});
	}

	return Array.from(platformMap.values());
};

@injectable()
export class FindSnapshotByIdUseCase {
	constructor(
		@inject(TOKENS.PortfolioSnapshotRepository) private portfolioSnapshotRepository: PortfolioSnapshotRepository,
	) {}

	async execute(userId: string, snapshotId: string): Promise<SnapshotDetail> {
		if (!userId || typeof userId !== "string") {
			throw new ValidationError("Invalid user ID", "userId");
		}

		if (!snapshotId || typeof snapshotId !== "string") {
			throw new ValidationError("Invalid snapshot ID", "snapshotId");
		}

		const response = await this.portfolioSnapshotRepository.findWithDetails(userId, snapshotId);
		if (!response) {
			throw new NotFoundError(`Portfolio snapshot ${snapshotId} not found`);
		}

		const { snapshot, items } = response;

		return {
			id: snapshot.id,
			snapshotDate: snapshot.snapshotDate,
			baseCurrency: snapshot.baseCurrency,
			fxUsdToBase: snapshot.fxUsdToBase,
			totalValueUsd: snapshot.totalValueUsd,
			totalValueBase: snapshot.totalValueBase,
			createdAt: snapshot.createdAt,
			updatedAt: snapshot.updatedAt,
			platforms: buildPlatforms(items),
		};
	}
}
