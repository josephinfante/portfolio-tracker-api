import { TransactionRepository } from "@modules/transactions/domain/transaction.repository";
import { TOKENS } from "@shared/container/tokens";
import { inject, injectable } from "tsyringe";
import { AdjustTransactionSchema } from "../validators/adjust-transaction.validator";
import { ValidationError } from "@shared/errors/domain/validation.error";
import { zodErrorMapper } from "@shared/helpers/zod-error-mapper";
import { NotFoundError } from "@shared/errors/domain/not-found.error";
import { AuthorizationError } from "@shared/errors/domain/authorization.error";
import { TransactionCorrectionType, TransactionType } from "@modules/transactions/domain/transaction.types";
import { D, toFixed } from "@shared/helpers/decimal";
import { BalanceGuardService } from "../services/balance-guard.service";
import { BalanceDelta } from "@modules/transactions/domain/balance.types";
import { RedisClient } from "@shared/redis/redis.client";
import { invalidateAccountHoldingsCache } from "../helpers/invalidate-account-holdings-cache";
import { invalidateAssetAllocationCache } from "../helpers/invalidate-asset-allocation-cache";

const correctionTypeValues = new Set(Object.values(TransactionCorrectionType));

@injectable()
export class AdjustTransactionUseCase {
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

		const result = AdjustTransactionSchema.safeParse(input);
		if (!result.success) {
			throw new ValidationError("Invalid transaction data", undefined, undefined, {
				context: { errors: zodErrorMapper(result.error) },
			});
		}

		const { reason, ...data } = result.data as Record<string, unknown>;

		const transaction = await this.transactionRepository.findById(id);
		if (!transaction) {
			throw new NotFoundError(`Transaction ${id} not found`);
		}

		if (transaction.userId !== userId) {
			throw new AuthorizationError("Access denied");
		}

		if (data.correctionType && !correctionTypeValues.has(data.correctionType as TransactionCorrectionType)) {
			throw new ValidationError("Invalid correction type", "correctionType");
		}

		if (data.quantity !== undefined) {
			data.quantity = toFixed(D(data.quantity as number));
		}

		if (data.paymentQuantity !== undefined) {
			data.paymentQuantity = toFixed(D(data.paymentQuantity as number));
		}

		if (data.totalAmount !== undefined) {
			data.totalAmount = toFixed(D(data.totalAmount as number));
		}

		if (data.exchangeRate !== undefined) {
			data.exchangeRate = data.exchangeRate === null ? null : toFixed(D(data.exchangeRate as number));
		}

		const current = {
			...transaction,
		};

		const quantityRaw = (data.quantity ?? current.quantity) as string | number;
		const quantity = D(quantityRaw);
		const paymentQuantityRaw = (data.paymentQuantity ?? current.paymentQuantity) as string | number;
		const paymentQuantity = D(paymentQuantityRaw);
		const totalAmount = paymentQuantity;

		const deltas: BalanceDelta[] = [];
		if (quantity.lt(0)) {
			deltas.push({
				accountId: current.accountId,
				assetId: current.assetId,
				delta: quantity.toNumber(),
			});
		}
		await this.balanceGuard.ensure(userId, deltas);

		const adjustment = await this.transactionRepository.create({
			userId,
			accountId: current.accountId,
			assetId: current.assetId,
			transactionType: current.transactionType as TransactionType,
			correctionType: (data.correctionType as TransactionCorrectionType | null) ?? TransactionCorrectionType.ADJUST,
			referenceTxId: id,
			quantity: toFixed(quantity),
			totalAmount: toFixed(totalAmount),
			paymentAssetId: (data.paymentAssetId as string | undefined) ?? current.paymentAssetId,
			paymentQuantity: toFixed(paymentQuantity),
			exchangeRate: data?.exchangeRate === undefined ? null : (data.exchangeRate as string | null),
			transactionDate: (data?.transactionDate as number) ?? current.transactionDate,
			notes: (data?.notes as string) || (data?.reason as string) || null,
		});

		await invalidateAccountHoldingsCache(this.redisClient, userId, [current.accountId]);
		await invalidateAssetAllocationCache(this.redisClient, userId);
		return adjustment;
	}
}
