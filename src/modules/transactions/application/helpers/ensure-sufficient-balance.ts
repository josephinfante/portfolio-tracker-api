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
	const grouped = new Map<string, Decimal>();

	for (const holding of input.holdings) {
		const key = `${holding.accountId}:${holding.assetId}`;
		balances.set(key, D(holding.quantity).toDecimalPlaces(8));
	}

	for (const delta of input.deltas) {
		const key = `${delta.accountId}:${delta.assetId}`;
		const current = grouped.get(key) ?? D(0);

		const value = D(delta.delta).toDecimalPlaces(8);

		grouped.set(key, current.plus(value));
	}

	for (const [key, totalDelta] of grouped.entries()) {
		if (!totalDelta.lt(0)) {
			continue;
		}

		const current = balances.get(key) ?? D(0);
		const next = current.plus(totalDelta);

		if (next.lt(0)) {
			throw new ValidationError("Insufficient funds", "balance");
		}

		balances.set(key, next);
	}
}
