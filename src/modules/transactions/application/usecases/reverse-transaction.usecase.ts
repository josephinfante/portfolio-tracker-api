import { TransactionRepository } from "@modules/transactions/domain/transaction.repository";
import { TOKENS } from "@shared/container/tokens";
import { ValidationError } from "@shared/errors/domain/validation.error";
import { inject, injectable } from "tsyringe";
import { NotFoundError } from "@shared/errors/domain/not-found.error";
import { AuthorizationError } from "@shared/errors/domain/authorization.error";
import { ReverseTransactionSchema } from "../validators/reverse-transaction.validator";
import { zodErrorMapper } from "@shared/helpers/zod-error-mapper";
import { BalanceGuardService } from "../services/balance-guard.service";
import { BalanceDelta } from "@modules/transactions/domain/balance.types";
import { D } from "@shared/helpers/decimal";
import { RedisClient } from "@shared/redis/redis.client";
import { invalidateAccountHoldingsCache } from "../helpers/invalidate-account-holdings-cache";

@injectable()
export class ReverseTransactionUseCase {
	constructor(
		@inject(TOKENS.TransactionRepository) private transactionRepository: TransactionRepository,
		@inject(TOKENS.BalanceGuardService) private balanceGuard: BalanceGuardService,
		@inject(TOKENS.RedisClient) private redisClient: RedisClient,
	) {}

	async execute(id: string, userId: string, input: unknown) {
		if (!id || typeof id !== "string") {
			throw new ValidationError("Invalid transaction ID", "id");
		}

		if (!userId || typeof userId !== "string") {
			throw new ValidationError("Invalid user ID", "userId");
		}

		const result = ReverseTransactionSchema.safeParse(input);
		if (!result.success) {
			throw new ValidationError("Invalid reverse data", undefined, undefined, {
				context: { errors: zodErrorMapper(result.error) },
			});
		}

		const transaction = await this.transactionRepository.findById(id);
		if (!transaction) {
			throw new NotFoundError(`Transaction ${id} not found`);
		}

		if (transaction.userId !== userId) {
			throw new AuthorizationError("Access denied");
		}

		const related = await this.transactionRepository.findByUserId(userId, { referenceTxId: id });
		const relatedTransactions = related.items.filter((item) => item.correctionType === null);

		const transactionsToReverse = [...relatedTransactions, transaction];

		const deltas: BalanceDelta[] = [];
		for (const item of transactionsToReverse) {
			const delta = D(item.quantity).neg();
			if (delta.lt(0)) {
				deltas.push({
					accountId: item.accountId,
					assetId: item.assetId,
					delta: delta.toNumber(),
				});
			}
		}
		await this.balanceGuard.ensure(userId, deltas);

		const reason = result.data.reason ?? null;
		const reversed = await this.transactionRepository.runInTransaction(async (tx) => {
			for (const item of relatedTransactions) {
				await this.transactionRepository.reverse(item.id, reason, tx);
			}

			return this.transactionRepository.reverse(id, reason, tx);
		});

		const accountIds = [transaction.accountId, ...relatedTransactions.map((item) => item.accountId)];
		await invalidateAccountHoldingsCache(this.redisClient, userId, accountIds);
		return reversed;
	}
}
