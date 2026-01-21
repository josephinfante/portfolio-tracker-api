import { AccountRepository } from "@modules/accounts/domain/account.repository";
import { AssetRepository } from "@modules/assets/domain/asset.repository";
import { AssetType } from "@modules/assets/domain/asset.types";
import { PlatformTypes } from "@modules/platforms/domain/platform.types";
import { TransactionRepository } from "@modules/transactions/domain/transaction.repository";
import { TransactionType } from "@modules/transactions/domain/transaction.types";
import { ExchangeAssetSchema } from "../validators/exchange-asset.validator";
import { TOKENS } from "@shared/container/tokens";
import { AuthorizationError } from "@shared/errors/domain/authorization.error";
import { BusinessLogicError } from "@shared/errors/domain/business-logic.error";
import { NotFoundError } from "@shared/errors/domain/not-found.error";
import { ValidationError } from "@shared/errors/domain/validation.error";
import { zodErrorMapper } from "@shared/helpers/zod-error-mapper";
import { inject, injectable } from "tsyringe";
import { D, toFixed } from "@shared/helpers/decimal";
import { BalanceGuardService } from "../services/balance-guard.service";
import { BalanceDelta } from "@modules/transactions/domain/balance.types";
import { RedisClient } from "@shared/redis/redis.client";
import { invalidateAccountHoldingsCache } from "../helpers/invalidate-account-holdings-cache";

@injectable()
export class ExchangeAssetUseCase {
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

		const result = ExchangeAssetSchema.safeParse(input);
		if (!result.success) {
			throw new ValidationError("Invalid exchange data", undefined, undefined, {
				context: { errors: zodErrorMapper(result.error) },
			});
		}

		const data = result.data;

		if (data.fromQuantity <= 0) {
			throw new BusinessLogicError("From quantity must be greater than 0");
		}

		if (data.toQuantity <= 0) {
			throw new BusinessLogicError("To quantity must be greater than 0");
		}

		if (data.fromAssetId === data.toAssetId) {
			throw new BusinessLogicError("Exchange requires different assets");
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

		const [fromAsset, toAsset] = await Promise.all([
			this.assetRepository.findById(data.fromAssetId),
			this.assetRepository.findById(data.toAssetId),
		]);

		if (!fromAsset) {
			throw new NotFoundError(`Asset ${data.fromAssetId} not found`);
		}

		if (!toAsset) {
			throw new NotFoundError(`Asset ${data.toAssetId} not found`);
		}

		this.assertAccountSupportsAsset(fromAccount, fromAsset, "source");
		this.assertAccountSupportsAsset(toAccount, toAsset, "destination");

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
				assetId: data.fromAssetId,
				delta: D(data.fromQuantity).neg().toNumber(),
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

		const sellTx = await this.transactionRepository.runInTransaction(async (tx) => {
			const sellTotalAmount = data.price ? D(data.fromQuantity).mul(D(data.price)) : D(data.fromQuantity);
			const sellTx = await this.transactionRepository.create(
				{
					userId,
					accountId: data.fromAccountId,
					assetId: data.fromAssetId,
					transactionType: TransactionType.SELL,
					correctionType: null,
					referenceTxId: null,
					quantity: toFixed(D(data.fromQuantity).neg()),
					totalAmount: toFixed(sellTotalAmount),
					paymentAssetId: data.fromAssetId,
					paymentQuantity: toFixed(sellTotalAmount),
					exchangeRate:
						data.exchangeRate === undefined || data.exchangeRate === null ? null : toFixed(D(data.exchangeRate)),
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
							referenceTxId: sellTx.id,
							quantity: toFixed(D(data.fee.amount).neg()),
							totalAmount: toFixed(D(data.fee.amount)),
							paymentAssetId: data.fee.assetId,
							paymentQuantity: toFixed(D(data.fee.amount)),
							exchangeRate: null,
							transactionDate,
							notes: `Fee for exchange ${sellTx.id}`,
					},
					tx,
				);
			}

			const destinationTransactionType =
				toAccount.platform?.type === PlatformTypes.bank ? TransactionType.DEPOSIT : TransactionType.BUY;

			const buyTotalAmount = data.price ? D(data.toQuantity).mul(D(data.price)) : D(data.toQuantity);
			await this.transactionRepository.create(
				{
					userId,
					accountId: data.toAccountId,
					assetId: data.toAssetId,
					transactionType: destinationTransactionType,
					correctionType: null,
					referenceTxId: sellTx.id,
					quantity: toFixed(D(data.toQuantity)),
					totalAmount: toFixed(buyTotalAmount),
					paymentAssetId: data.toAssetId,
					paymentQuantity: toFixed(buyTotalAmount),
					exchangeRate:
						data.exchangeRate === undefined || data.exchangeRate === null ? null : toFixed(D(data.exchangeRate)),
					transactionDate,
					notes: data.notes ?? null,
				},
				tx,
			);

			return sellTx;
		});

		await invalidateAccountHoldingsCache(this.redisClient, userId, [data.fromAccountId, data.toAccountId]);
		return sellTx;
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
