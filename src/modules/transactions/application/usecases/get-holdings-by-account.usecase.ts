import { TransactionRepository } from "@modules/transactions/domain/transaction.repository";
import { Holding, TransactionCorrectionType, TransactionType } from "@modules/transactions/domain/transaction.types";
import { TOKENS } from "@shared/container/tokens";
import { ValidationError } from "@shared/errors/domain/validation.error";
import { inject, injectable } from "tsyringe";

const transactionTypeSigns = new Map<TransactionType, number>([
	[TransactionType.BUY, 1],
	[TransactionType.SELL, -1],
	[TransactionType.DEPOSIT, 1],
	[TransactionType.WITHDRAW, -1],
	[TransactionType.TRANSFER_IN, 1],
	[TransactionType.TRANSFER_OUT, -1],
	[TransactionType.INTEREST, 1],
	[TransactionType.REWARD, 1],
	[TransactionType.DIVIDEND, 1],
	[TransactionType.FEE, -1],
]);

const normalizeQuantity = (
	transactionType: TransactionType,
	correctionType: TransactionCorrectionType | null,
	quantity: number,
) => {
	if (!Number.isFinite(quantity) || quantity === 0) {
		return 0;
	}

	if (correctionType) {
		return quantity;
	}

	const sign = transactionTypeSigns.get(transactionType);
	if (!sign) {
		return quantity;
	}

	if (quantity < 0) {
		return quantity;
	}

	return quantity * sign;
};

@injectable()
export class GetHoldingsByAccountUseCase {
	constructor(@inject(TOKENS.TransactionRepository) private transactionRepository: TransactionRepository) {}

	async execute(userId: string): Promise<Holding[]> {
		if (!userId || typeof userId !== "string") {
			throw new ValidationError("Invalid user ID", "userId");
		}

		const { items } = await this.transactionRepository.findByUserId(userId, { limit: 0, offset: 0 });
		const holdings = new Map<string, { accountId: string; assetId: string; quantity: number }>();

		for (const transaction of items) {
			const normalizedQuantity = normalizeQuantity(
				transaction.transactionType,
				transaction.correctionType,
				transaction.quantity,
			);
			if (normalizedQuantity === 0) {
				continue;
			}

			const key = `${transaction.accountId}:${transaction.assetId}`;
			const current = holdings.get(key) ?? {
				accountId: transaction.accountId,
				assetId: transaction.assetId,
				quantity: 0,
			};

			current.quantity += normalizedQuantity;
			holdings.set(key, current);
		}

		return Array.from(holdings.values())
			.filter((holding) => holding.quantity !== 0)
			.sort((a, b) => {
				if (a.accountId === b.accountId) {
					return a.assetId.localeCompare(b.assetId);
				}
				return a.accountId.localeCompare(b.accountId);
			})
			.map((holding) => ({
				accountId: holding.accountId,
				assetId: holding.assetId,
				quantity: holding.quantity,
			}));
	}
}
