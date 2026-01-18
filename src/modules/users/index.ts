import { TOKENS } from "@shared/container/tokens";
import { container } from "tsyringe";
import { UserSqlRepository } from "./infrastructure/user-sql.repository";

export function registerUserModule(): void {
	container.registerSingleton(TOKENS.UserRepository, UserSqlRepository);
}
