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

const normalizeCurrencyCode = (value: string) => value.trim().toUpperCase();

@injectable()
export class ExchangeAssetUseCase {
	constructor(
		@inject(TOKENS.TransactionRepository) private transactionRepository: TransactionRepository,
		@inject(TOKENS.AccountRepository) private accountRepository: AccountRepository,
		@inject(TOKENS.AssetRepository) private assetRepository: AssetRepository,
		@inject(TOKENS.BalanceGuardService) private balanceGuard: BalanceGuardService,
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
		const fromCurrencyCode = normalizeCurrencyCode(fromAsset.symbol);
		const toCurrencyCode = normalizeCurrencyCode(toAsset.symbol);

		return await this.transactionRepository.runInTransaction(async (tx) => {
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
					unitPrice: data.price === undefined || data.price === null ? null : toFixed(D(data.price)),
					totalAmount: toFixed(sellTotalAmount),
					currencyCode: fromCurrencyCode,
					exchangeRate:
						data.exchangeRate === undefined || data.exchangeRate === null ? null : toFixed(D(data.exchangeRate)),
					transactionDate,
					notes: data.notes ?? null,
				},
				tx,
			);

			if (data.fee && feeAsset) {
				const feeCurrencyCode = normalizeCurrencyCode(feeAsset.symbol);
				await this.transactionRepository.create(
					{
						userId,
						accountId: data.fromAccountId,
						assetId: data.fee.assetId,
						transactionType: TransactionType.FEE,
						correctionType: null,
						referenceTxId: sellTx.id,
						quantity: toFixed(D(data.fee.amount).neg()),
						unitPrice: "1",
						totalAmount: toFixed(D(data.fee.amount)),
						currencyCode: feeCurrencyCode,
						exchangeRate: null,
						transactionDate,
						notes: `Fee for exchange ${sellTx.id}`,
					},
					tx,
				);
			}

			const buyTotalAmount = data.price ? D(data.toQuantity).mul(D(data.price)) : D(data.toQuantity);
			await this.transactionRepository.create(
				{
					userId,
					accountId: data.toAccountId,
					assetId: data.toAssetId,
					transactionType: TransactionType.BUY,
					correctionType: null,
					referenceTxId: sellTx.id,
					quantity: toFixed(D(data.toQuantity)),
					unitPrice: data.price === undefined || data.price === null ? null : toFixed(D(data.price)),
					totalAmount: toFixed(buyTotalAmount),
					currencyCode: toCurrencyCode,
					exchangeRate:
						data.exchangeRate === undefined || data.exchangeRate === null ? null : toFixed(D(data.exchangeRate)),
					transactionDate,
					notes: data.notes ?? null,
				},
				tx,
			);

			return sellTx;
		});
	}

	private assertAccountSupportsAsset(
		account: { id: string; platform?: { type: string } },
		asset: { asset_type: AssetType },
		label: string,
	) {
		const platformType = account.platform?.type;

		if (platformType === PlatformTypes.bank && asset.asset_type !== AssetType.fiat) {
			throw new BusinessLogicError(`The ${label} account does not support this asset type`);
		}
	}
}
