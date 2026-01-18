import { injectable } from "tsyringe";
import { BuiltSnapshot } from "../domain/portfolio-snapshot.entity";
import { CreateTodaySnapshotUseCase } from "./usecases/create-today-snapshot.usecase";
import { FindSnapshotsUseCase } from "./usecases/find-snapshots.usecase";
import { SnapshotListFilters } from "../domain/portfolio-snapshot.types";
import { FindSnapshotByIdUseCase } from "./usecases/find-snapshot-by-id.usecase";
import { SnapshotDetail } from "../domain/portfolio-snapshot.entity";

@injectable()
export class PortfolioSnapshotService {
	constructor(
		private createTodaySnapshotUseCase: CreateTodaySnapshotUseCase,
		private findSnapshotsUseCase: FindSnapshotsUseCase,
		private findSnapshotByIdUseCase: FindSnapshotByIdUseCase,
	) {}

	async createTodaySnapshot(userId: string, timeZone?: string): Promise<BuiltSnapshot> {
		return await this.createTodaySnapshotUseCase.execute(userId, timeZone);
	}

	async findSnapshots(userId: string, options?: SnapshotListFilters) {
		return await this.findSnapshotsUseCase.execute(userId, options);
	}

	async findSnapshotById(userId: string, snapshotId: string): Promise<SnapshotDetail> {
		return await this.findSnapshotByIdUseCase.execute(userId, snapshotId);
	}
}
