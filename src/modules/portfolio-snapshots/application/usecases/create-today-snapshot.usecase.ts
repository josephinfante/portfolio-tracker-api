import { BuildSnapshotUseCase } from "@modules/portfolio-snapshots/application/usecases/build-snapshot.usecase";
import { PortfolioSnapshotRepository } from "@modules/portfolio-snapshots/domain/portfolio-snapshot.repository";
import { BuiltSnapshot } from "@modules/portfolio-snapshots/domain/portfolio-snapshot.entity";
import { TOKENS } from "@shared/container/tokens";
import { ValidationError } from "@shared/errors/domain/validation.error";
import { inject, injectable } from "tsyringe";

@injectable()
export class CreateTodaySnapshotUseCase {
	constructor(
		private buildSnapshotUseCase: BuildSnapshotUseCase,
		@inject(TOKENS.PortfolioSnapshotRepository) private portfolioSnapshotRepository: PortfolioSnapshotRepository,
	) {}

	async execute(userId: string, timeZone?: string): Promise<BuiltSnapshot> {
		if (!userId || typeof userId !== "string") {
			throw new ValidationError("Invalid user ID", "userId");
		}

		const snapshot = await this.buildSnapshotUseCase.execute(userId, timeZone);

		await this.portfolioSnapshotRepository.runInTransaction(async (tx) => {
			const existing = await this.portfolioSnapshotRepository.findByUserAndDate(
				userId,
				snapshot.snapshotDate,
				tx,
			);

			if (!existing) {
				const created = await this.portfolioSnapshotRepository.createSnapshot(
					{
						userId,
						snapshotDate: snapshot.snapshotDate,
						fxUsdToBase: snapshot.fxUsdToBase,
						totalValueUsd: snapshot.totalValueUsd,
						totalValueBase: snapshot.totalValueBase,
					},
					tx,
				);

				await this.portfolioSnapshotRepository.replaceSnapshotItems(
					created.id,
					snapshot.items.map((item) => ({
						accountId: item.accountId,
						assetId: item.assetId,
						quantity: item.quantity,
						priceUsd: item.priceUsd,
						priceBase: item.priceBase,
						valueUsd: item.valueUsd,
						valueBase: item.valueBase,
					})),
					tx,
				);

				return;
			}

			await this.portfolioSnapshotRepository.updateSnapshot(
				existing.id,
				{
					fxUsdToBase: snapshot.fxUsdToBase,
					totalValueUsd: snapshot.totalValueUsd,
					totalValueBase: snapshot.totalValueBase,
				},
				tx,
			);

			await this.portfolioSnapshotRepository.replaceSnapshotItems(
				existing.id,
				snapshot.items.map((item) => ({
					accountId: item.accountId,
					assetId: item.assetId,
					quantity: item.quantity,
					priceUsd: item.priceUsd,
					priceBase: item.priceBase,
					valueUsd: item.valueUsd,
					valueBase: item.valueBase,
				})),
				tx,
			);
		});

		return snapshot;
	}
}
