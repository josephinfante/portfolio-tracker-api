import Decimal from "decimal.js";
import { D } from "@shared/helpers/decimal";
import { Holding } from "@modules/transactions/domain/transaction.types";
import { BalanceDelta } from "@modules/transactions/domain/balance.types";
import { ValidationError } from "@shared/errors/domain/validation.error";

export function ensureSufficientBalance(input: { holdings: Holding[]; deltas: BalanceDelta[] }): void {
	if (!input.deltas.length) {
		return;
	}

	const balances = new Map<string, Decimal>();
	for (const holding of input.holdings) {
		const key = `${holding.accountId}:${holding.assetId}`;
		balances.set(key, D(holding.quantity));
	}

	for (const delta of input.deltas) {
		const deltaValue = D(delta.delta);
		if (!deltaValue.lt(0)) {
			continue;
		}

		const key = `${delta.accountId}:${delta.assetId}`;
		const current = balances.get(key) ?? D(0);
		const next = current.plus(deltaValue);

		if (next.lt(0)) {
			throw new ValidationError("Insufficient funds", "balance");
		}

		balances.set(key, next);
	}
}
