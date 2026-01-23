import { AccountRepository } from "@modules/accounts/domain/account.repository";
import { AssetRepository } from "@modules/assets/domain/asset.repository";
import { TransactionRepository } from "@modules/transactions/domain/transaction.repository";
import { TransactionCorrectionType, TransactionType } from "@modules/transactions/domain/transaction.types";
import { TOKENS } from "@shared/container/tokens";
import { AuthorizationError } from "@shared/errors/domain/authorization.error";
import { NotFoundError } from "@shared/errors/domain/not-found.error";
import { ValidationError } from "@shared/errors/domain/validation.error";
import { inject, injectable } from "tsyringe";
import { AccountBalanceResponse } from "@modules/accounts/domain/account-balance.types";
import { AssetType } from "@modules/assets/domain/asset.types";
import Decimal from "decimal.js";
import { D } from "@shared/helpers/decimal";

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

const totalBalanceAssetTypes = new Set<AssetType>([AssetType.fiat, AssetType.stablecoin]);

@injectable()
export class GetAccountBalanceUseCase {
	constructor(
		@inject(TOKENS.AccountRepository) private accountRepository: AccountRepository,
		@inject(TOKENS.TransactionRepository) private transactionRepository: TransactionRepository,
		@inject(TOKENS.AssetRepository) private assetRepository: AssetRepository,
	) {}

	async execute(userId: string, accountId: string): Promise<AccountBalanceResponse> {
		if (!userId || typeof userId !== "string") {
			throw new ValidationError("Invalid user ID", "userId");
		}

		if (!accountId || typeof accountId !== "string") {
			throw new ValidationError("Invalid account ID", "accountId");
		}

		const account = await this.accountRepository.findById(accountId);
		if (!account) {
			throw new NotFoundError(`Account ${accountId} not found`);
		}

		if (account.userId !== userId) {
			throw new AuthorizationError("Access denied");
		}

		const { items } = await this.transactionRepository.findByUserId(userId, { limit: 0, offset: 0 });
		const balances = new Map<string, Decimal>();

		for (const transaction of items) {
			if (transaction.accountId !== accountId) {
				continue;
			}
			const normalized = normalizeQuantity(
				transaction.transactionType,
				transaction.correctionType,
				transaction.quantity,
			);
			if (normalized === 0) {
				continue;
			}
			const current = balances.get(transaction.assetId) ?? D(0);
			balances.set(transaction.assetId, current.add(normalized));
		}

		const assetIds = Array.from(balances.keys());
		const assets = assetIds.length ? await this.assetRepository.findByIdentifiers(assetIds) : [];
		const assetMap = new Map(assets.map((asset) => [asset.id, asset]));

		const response = Array.from(balances.entries())
			.map(([assetId, quantity]) => ({
				assetId,
				quantity: quantity.toNumber(),
				asset: assetMap.get(assetId) ?? null,
			}))

			.filter((item) => item.quantity !== 0)
			.filter((item) => item.asset && totalBalanceAssetTypes.has(item.asset.asset_type))
			.map((item) => ({
				assetId: item.assetId,
				quantity: item.quantity,
				asset: item.asset
					? {
							id: item.asset.id,
							symbol: item.asset.symbol,
							name: item.asset.name,
						}
					: null,
			}))
			.sort((a, b) => a.assetId.localeCompare(b.assetId));

		return {
			accountId,
			items: response,
		};
	}
}
