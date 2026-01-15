import { AccountRepository } from "@modules/accounts/domain/account.repository";
import { AssetRepository } from "@modules/assets/domain/asset.repository";
import { AssetType } from "@modules/assets/domain/asset.types";
import { PlatformTypes } from "@modules/platforms/domain/platform.types";
import { ExchangeAssetUseCase } from "./exchange-asset.usecase";
import { TransferAssetUseCase } from "./transfer-asset.usecase";
import { MoveAssetSchema } from "../validators/move-asset.validator";
import { TOKENS } from "@shared/container/tokens";
import { AuthorizationError } from "@shared/errors/domain/authorization.error";
import { BusinessLogicError } from "@shared/errors/domain/business-logic.error";
import { NotFoundError } from "@shared/errors/domain/not-found.error";
import { ValidationError } from "@shared/errors/domain/validation.error";
import { zodErrorMapper } from "@shared/helpers/zod-error-mapper";
import { inject, injectable } from "tsyringe";

@injectable()
export class MoveAssetUseCase {
	constructor(
		@inject(TOKENS.AccountRepository) private accountRepository: AccountRepository,
		@inject(TOKENS.AssetRepository) private assetRepository: AssetRepository,
		private exchangeAssetUseCase: ExchangeAssetUseCase,
		private transferAssetUseCase: TransferAssetUseCase,
	) {}

	async execute(userId: string, input: unknown) {
		if (!userId || typeof userId !== "string") {
			throw new ValidationError("Invalid user ID", "userId");
		}

		const result = MoveAssetSchema.safeParse(input);
		if (!result.success) {
			throw new ValidationError("Invalid move data", undefined, undefined, {
				context: { errors: zodErrorMapper(result.error) },
			});
		}

		const data = result.data;

		if (data.fromQuantity <= 0) {
			throw new BusinessLogicError("From quantity must be greater than 0");
		}

		if (data.toQuantity !== undefined && data.toQuantity <= 0) {
			throw new BusinessLogicError("To quantity must be greater than 0");
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

		const feeAsset = data.fee ? await this.assetRepository.findById(data.fee.assetId) : null;
		if (data.fee && !feeAsset) {
			throw new NotFoundError(`Asset ${data.fee.assetId} not found`);
		}

		this.assertAccountSupportsAsset(fromAccount, fromAsset, "source");
		this.assertAccountSupportsAsset(toAccount, toAsset, "destination");

		if (data.fromAssetId !== data.toAssetId && fromAccount.platform?.type !== toAccount.platform?.type) {
			this.assertAccountSupportsAsset(fromAccount, toAsset, "source");
		}

		if (feeAsset) {
			this.assertAccountSupportsAsset(fromAccount, feeAsset, "source");
		}

		if (data.fee && data.fee.amount <= 0) {
			throw new BusinessLogicError("Fee amount must be greater than 0");
		}

		if (data.fromAssetId === data.toAssetId) {
			return this.transferAssetUseCase.execute(userId, {
				fromAccountId: data.fromAccountId,
				toAccountId: data.toAccountId,
				assetId: data.fromAssetId,
				quantity: data.fromQuantity,
				fee: data.fee,
				notes: data.notes,
				transactionDate: data.transactionDate,
			});
		}

		if (data.fromAssetId !== data.toAssetId && fromAccount.platform?.type === toAccount.platform?.type) {
			if (!data.toQuantity) {
				throw new BusinessLogicError("To quantity is required for exchange");
			}

			return this.exchangeAssetUseCase.execute(userId, {
				fromAccountId: data.fromAccountId,
				toAccountId: data.toAccountId,
				fromAssetId: data.fromAssetId,
				toAssetId: data.toAssetId,
				fromQuantity: data.fromQuantity,
				toQuantity: data.toQuantity,
				price: data.price,
				exchangeRate: data.exchangeRate,
				fee: data.fee,
				notes: data.notes,
				transactionDate: data.transactionDate,
			});
		}

		if (!data.toQuantity) {
			throw new BusinessLogicError("To quantity is required for exchange");
		}

		await this.exchangeAssetUseCase.execute(userId, {
			fromAccountId: data.fromAccountId,
			toAccountId: data.fromAccountId,
			fromAssetId: data.fromAssetId,
			toAssetId: data.toAssetId,
			fromQuantity: data.fromQuantity,
			toQuantity: data.toQuantity,
			price: data.price,
			exchangeRate: data.exchangeRate,
			fee: data.fee,
			notes: data.notes,
			transactionDate: data.transactionDate,
		});

		return this.transferAssetUseCase.execute(userId, {
			fromAccountId: data.fromAccountId,
			toAccountId: data.toAccountId,
			assetId: data.toAssetId,
			quantity: data.toQuantity,
			notes: data.notes,
			transactionDate: data.transactionDate,
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
