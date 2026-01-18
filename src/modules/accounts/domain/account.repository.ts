import { AccountEntity } from "./account.entity";
import { AccountListFilters, CreateAccountInput, UpdateAccountInput } from "./account.types";

export interface AccountRepository {
	findById(id: string): Promise<AccountEntity | null>;
	findByUserId(userId: string, options?: AccountListFilters): Promise<{ items: AccountEntity[]; totalCount: number }>;

	create(data: CreateAccountInput): Promise<AccountEntity>;
	update(id: string, data: UpdateAccountInput): Promise<AccountEntity>;
	delete(id: string): Promise<void>;
}
