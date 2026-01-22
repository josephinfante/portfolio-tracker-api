import { injectable } from "tsyringe";
import { BuiltSnapshot } from "../domain/portfolio-snapshot.entity";
import { CreateTodaySnapshotUseCase } from "./usecases/create-today-snapshot.usecase";
import { FindSnapshotsUseCase } from "./usecases/find-snapshots.usecase";
import { SnapshotListFilters } from "../domain/portfolio-snapshot.types";
import { FindSnapshotByIdUseCase } from "./usecases/find-snapshot-by-id.usecase";
import { SnapshotDetail } from "../domain/portfolio-snapshot.entity";
import { GetPortfolioMetricsUseCase } from "./usecases/get-portfolio-metrics.usecase";
import { PortfolioMetricsResponse } from "../domain/portfolio-metrics.types";
import { GetPortfolioPerformanceUseCase } from "./usecases/get-portfolio-performance.usecase";
import { PerformanceResponseDto } from "../domain/portfolio-performance.types";

@injectable()
export class PortfolioSnapshotService {
	constructor(
		private createTodaySnapshotUseCase: CreateTodaySnapshotUseCase,
		private findSnapshotsUseCase: FindSnapshotsUseCase,
		private findSnapshotByIdUseCase: FindSnapshotByIdUseCase,
		private getPortfolioMetricsUseCase: GetPortfolioMetricsUseCase,
		private getPortfolioPerformanceUseCase: GetPortfolioPerformanceUseCase,
	) {}

	async createTodaySnapshot(userId: string): Promise<BuiltSnapshot> {
		return await this.createTodaySnapshotUseCase.execute(userId);
	}

	async findSnapshots(userId: string, options?: SnapshotListFilters) {
		return await this.findSnapshotsUseCase.execute(userId, options);
	}

	async findSnapshotById(userId: string, snapshotId: string): Promise<SnapshotDetail> {
		return await this.findSnapshotByIdUseCase.execute(userId, snapshotId);
	}

	async getMetrics(userId: string, timeZone?: string): Promise<PortfolioMetricsResponse> {
		return await this.getPortfolioMetricsUseCase.execute(userId, timeZone);
	}

	async getPerformance(userId: string, query: unknown): Promise<PerformanceResponseDto> {
		return await this.getPortfolioPerformanceUseCase.execute(userId, query);
	}
}
