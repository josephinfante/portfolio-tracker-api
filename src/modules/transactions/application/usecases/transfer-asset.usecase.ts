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

const normalizeCurrencyCode = (value: string) => value.trim().toUpperCase();

@injectable()
export class TransferAssetUseCase {
	constructor(
		@inject(TOKENS.TransactionRepository) private transactionRepository: TransactionRepository,
		@inject(TOKENS.AccountRepository) private accountRepository: AccountRepository,
		@inject(TOKENS.AssetRepository) private assetRepository: AssetRepository,
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

		if (asset.userId !== userId) {
			throw new AuthorizationError("Access denied");
		}

		this.assertAccountSupportsAsset(fromAccount, asset, "source");
		this.assertAccountSupportsAsset(toAccount, asset, "destination");

		const balance = await this.transactionRepository.getAssetBalance(userId, data.fromAccountId, data.assetId);
		const feeAmount = data.fee?.amount ?? 0;
		const requiredBalance = data.fee?.assetId === data.assetId ? data.quantity + feeAmount : data.quantity;

		if (balance < requiredBalance) {
			throw new BusinessLogicError("Insufficient balance for transfer");
		}

		if (data.fee && data.fee.amount <= 0) {
			throw new BusinessLogicError("Fee amount must be greater than 0");
		}

		const feeAsset = data.fee ? await this.assetRepository.findById(data.fee.assetId) : null;
		if (data.fee && !feeAsset) {
			throw new NotFoundError(`Asset ${data.fee.assetId} not found`);
		}

		if (feeAsset && feeAsset.userId !== userId) {
			throw new AuthorizationError("Access denied");
		}

		if (feeAsset) {
			this.assertAccountSupportsAsset(fromAccount, feeAsset, "source");
		}

		const transactionDate = data.transactionDate ?? Date.now();
		const currencyCode = normalizeCurrencyCode(asset.symbol);

		return await this.transactionRepository.runInTransaction(async (tx) => {
			const transferOut = await this.transactionRepository.create(
				{
					userId,
					accountId: data.fromAccountId,
					assetId: data.assetId,
					transactionType: TransactionType.TRANSFER_OUT,
					correctionType: null,
					referenceTxId: null,
					quantity: (-data.quantity).toString(),
					unitPrice: null,
					totalAmount: (-data.quantity).toString(),
					currencyCode,
					exchangeRate: null,
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
						referenceTxId: transferOut.id,
						quantity: (-data.fee.amount).toString(),
						unitPrice: "1",
						totalAmount: data.fee.amount.toString(),
						currencyCode: feeCurrencyCode,
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
					transactionType: TransactionType.TRANSFER_IN,
					correctionType: null,
					referenceTxId: transferOut.id,
					quantity: data.quantity.toString(),
					unitPrice: null,
					totalAmount: data.quantity.toString(),
					currencyCode,
					exchangeRate: null,
					transactionDate,
					notes: data.notes ?? null,
				},
				tx,
			);

			return transferOut;
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
