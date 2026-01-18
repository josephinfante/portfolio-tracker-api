import { injectable, inject } from "tsyringe";
import { TOKENS } from "@shared/container/tokens";
import { GetHoldingsByAccountUseCase } from "@modules/transactions/application/usecases/get-holdings-by-account.usecase";
import { BalanceDelta } from "@modules/transactions/domain/balance.types";
import { ensureSufficientBalance } from "@modules/transactions/application/helpers/ensure-sufficient-balance";

@injectable()
export class BalanceGuardService {
	constructor(
		@inject(TOKENS.GetHoldingsByAccountUseCase)
		private getHoldingsByAccountUseCase: GetHoldingsByAccountUseCase,
	) {}

	async ensure(userId: string, deltas: BalanceDelta[]): Promise<void> {
		if (deltas.length === 0) {
			return;
		}

		const holdings = await this.getHoldingsByAccountUseCase.execute(userId);
		ensureSufficientBalance({ holdings, deltas });
	}
}
