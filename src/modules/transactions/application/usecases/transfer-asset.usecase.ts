import { AccountRepository } from "@modules/accounts/domain/account.repository";
import { AssetRepository } from "@modules/assets/domain/asset.repository";
import { TransactionRepository } from "@modules/transactions/domain/transaction.repository";
import { TransferAssetSchema } from "../validators/transfer-asset.validator";
import { TOKENS } from "@shared/container/tokens";
import { inject, injectable } from "tsyringe";
import { ValidationError } from "@shared/errors/domain/validation.error";
import { zodErrorMapper } from "@shared/helpers/zod-error-mapper";
import { NotFoundError } from "@shared/errors/domain/not-found.error";
import { AuthorizationError } from "@shared/errors/domain/authorization.error";
import { BusinessLogicError } from "@shared/errors/domain/business-logic.error";
import { TransactionType } from "@modules/transactions/domain/transaction.types";
import { AssetType } from "@modules/assets/domain/asset.types";
import { PlatformTypes } from "@modules/platforms/domain/platform.types";
import { D, toFixed } from "@shared/helpers/decimal";
import { BalanceGuardService } from "../services/balance-guard.service";
import { BalanceDelta } from "@modules/transactions/domain/balance.types";
import { RedisClient } from "@shared/redis/redis.client";
import { invalidateAccountHoldingsCache } from "../helpers/invalidate-account-holdings-cache";
import { invalidateAssetAllocationCache } from "../helpers/invalidate-asset-allocation-cache";

@injectable()
export class TransferAssetUseCase {
	constructor(
		@inject(TOKENS.TransactionRepository) private transactionRepository: TransactionRepository,
		@inject(TOKENS.AccountRepository) private accountRepository: AccountRepository,
		@inject(TOKENS.AssetRepository) private assetRepository: AssetRepository,
		@inject(TOKENS.BalanceGuardService) private balanceGuard: BalanceGuardService,
		@inject(TOKENS.RedisClient) private redisClient: RedisClient,
	) {}

	async execute(userId: string, input: unknown) {
		if (!userId || typeof userId !== "string") {
			throw new ValidationError("Invalid user ID", "userId");
		}

		const result = TransferAssetSchema.safeParse(input);
		if (!result.success) {
			throw new ValidationError("Invalid transfer data", undefined, undefined, {
				context: { errors: zodErrorMapper(result.error) },
			});
		}

		const data = result.data;

		if (data.quantity <= 0) {
			throw new BusinessLogicError("Quantity must be greater than 0");
		}

		if (data.fromAccountId === data.toAccountId) {
			throw new BusinessLogicError("Source and destination accounts must be different");
		}

		const [fromAccount, toAccount] = await Promise.all([
			this.accountRepository.findById(data.fromAccountId),
			this.accountRepository.findById(data.toAccountId),
		]);

		if (!fromAccount) {
			throw new NotFoundError(`Account ${data.fromAccountId} not found`);
		}

		if (!toAccount) {
			throw new NotFoundError(`Account ${data.toAccountId} not found`);
		}

		if (fromAccount.userId !== userId || toAccount.userId !== userId) {
			throw new AuthorizationError("Access denied");
		}

		const asset = await this.assetRepository.findById(data.assetId);
		if (!asset) {
			throw new NotFoundError(`Asset ${data.assetId} not found`);
		}

		this.assertAccountSupportsAsset(fromAccount, asset, "source");
		this.assertAccountSupportsAsset(toAccount, asset, "destination");

		if (data.fee && data.fee.amount <= 0) {
			throw new BusinessLogicError("Fee amount must be greater than 0");
		}

		const feeAsset = data.fee ? await this.assetRepository.findById(data.fee.assetId) : null;
		if (data.fee && !feeAsset) {
			throw new NotFoundError(`Asset ${data.fee.assetId} not found`);
		}

		if (feeAsset) {
			this.assertAccountSupportsAsset(fromAccount, feeAsset, "source");
		}

		const deltas: BalanceDelta[] = [
			{
				accountId: data.fromAccountId,
				assetId: data.assetId,
				delta: D(data.quantity).neg().toNumber(),
			},
		];
		if (data.fee) {
			deltas.push({
				accountId: data.fromAccountId,
				assetId: data.fee.assetId,
				delta: D(data.fee.amount).neg().toNumber(),
			});
		}
		await this.balanceGuard.ensure(userId, deltas);

		const transactionDate = data.transactionDate ?? Date.now();
		const samePlatform = fromAccount.platform?.type === toAccount.platform?.type;
		const outgoingType = samePlatform ? TransactionType.TRANSFER_OUT : TransactionType.WITHDRAW;
		const incomingType = samePlatform ? TransactionType.TRANSFER_IN : TransactionType.DEPOSIT;

		const transferOut = await this.transactionRepository.runInTransaction(async (tx) => {
			const transferOut = await this.transactionRepository.create(
				{
					userId,
					accountId: data.fromAccountId,
					assetId: data.assetId,
					transactionType: outgoingType,
					correctionType: null,
					referenceTxId: null,
					quantity: toFixed(D(data.quantity).neg()),
					totalAmount: toFixed(D(data.quantity).neg()),
					paymentAssetId: data.assetId,
					paymentQuantity: toFixed(D(data.quantity).neg()),
					exchangeRate: null,
					transactionDate,
					notes: data.notes ?? null,
				},
				tx,
			);

			if (data.fee && feeAsset) {
				await this.transactionRepository.create(
					{
						userId,
						accountId: data.fromAccountId,
						assetId: data.fee.assetId,
						transactionType: TransactionType.FEE,
						correctionType: null,
						referenceTxId: transferOut.id,
						quantity: toFixed(D(data.fee.amount).neg()),
						totalAmount: toFixed(D(data.fee.amount)),
						paymentAssetId: data.fee.assetId,
						paymentQuantity: toFixed(D(data.fee.amount)),
						exchangeRate: null,
						transactionDate,
						notes: `Fee for transfer ${transferOut.id}`,
					},
					tx,
				);
			}

			await this.transactionRepository.create(
				{
					userId,
					accountId: data.toAccountId,
					assetId: data.assetId,
					transactionType: incomingType,
					correctionType: null,
					referenceTxId: transferOut.id,
					quantity: toFixed(D(data.quantity)),
					totalAmount: toFixed(D(data.quantity)),
					paymentAssetId: data.assetId,
					paymentQuantity: toFixed(D(data.quantity)),
					exchangeRate: null,
					transactionDate,
					notes: data.notes ?? null,
				},
				tx,
			);

			return transferOut;
		});

		await invalidateAccountHoldingsCache(this.redisClient, userId, [data.fromAccountId, data.toAccountId]);
		await invalidateAssetAllocationCache(this.redisClient, userId);
		return transferOut;
	}

	private assertAccountSupportsAsset(
		account: { id: string; platform?: { type: string }; currencyCode?: string | null },
		asset: { asset_type: AssetType; symbol: string },
		label: string,
	) {
		const platformType = account.platform?.type;

		if (platformType === PlatformTypes.bank && asset.asset_type !== AssetType.fiat) {
			throw new BusinessLogicError(`The ${label} account does not support this asset type`);
		}

		if (platformType === PlatformTypes.bank) {
			const currencyCode = account.currencyCode?.toUpperCase();
			if (!currencyCode) {
				throw new BusinessLogicError(`The ${label} account requires a currency code`);
			}
			if (asset.symbol.toUpperCase() !== currencyCode) {
				throw new BusinessLogicError(`The ${label} account only supports ${currencyCode} assets`);
			}
		}
	}
}
