import { injectable } from "tsyringe";
import { CreatePlatformUseCase } from "./usecases/create-platform.usecase";
import { UpdatePlatformUseCase } from "./usecases/update-platform.usecase";
import { DeletePlatformUseCase } from "./usecases/delete-platform.usecase";
import { ListPlatformsUseCase } from "./usecases/list-platforms.usecase";
import { FindPlatformUseCase } from "./usecases/find-platform.usecase";
import { PlatformEntity } from "../domain/platform.entity";
import { FindByUserIdFilters } from "../domain/platform.types";
import { PaginatedResponse } from "@shared/types/paginated-response";

@injectable()
export class PlatformService {
	constructor(
		private createPlatformUseCase: CreatePlatformUseCase,
		private updatePlatformUseCase: UpdatePlatformUseCase,
		private deletePlatformUseCase: DeletePlatformUseCase,
		private listPlatformsUseCase: ListPlatformsUseCase,
		private findPlatformUseCase: FindPlatformUseCase,
	) {}

	async createPlatform(userId: string, input: unknown): Promise<PlatformEntity> {
		return await this.createPlatformUseCase.execute(userId, input);
	}

	async updatePlatform(id: string, userId: string, input: unknown): Promise<PlatformEntity> {
		return await this.updatePlatformUseCase.execute(id, userId, input);
	}

	async deletePlatform(id: string, userId: string): Promise<void> {
		await this.deletePlatformUseCase.execute(id, userId);
	}

	async listPlatforms(userId: string, options?: FindByUserIdFilters): Promise<PaginatedResponse<PlatformEntity>> {
		return await this.listPlatformsUseCase.execute(userId, options);
	}

	async findPlatform(id: string, userId: string): Promise<PlatformEntity> {
		return await this.findPlatformUseCase.execute(id, userId);
	}
}
