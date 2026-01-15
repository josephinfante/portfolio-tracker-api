import { TransactionRepository } from "@modules/transactions/domain/transaction.repository";
import { AssetRepository } from "@modules/assets/domain/asset.repository";
import { AccountRepository } from "@modules/accounts/domain/account.repository";
import { TOKENS } from "@shared/container/tokens";
import { inject, injectable } from "tsyringe";
import { CreateTransactionSchema } from "../validators/create-transaction.validator";
import { ValidationError } from "@shared/errors/domain/validation.error";
import { zodErrorMapper } from "@shared/helpers/zod-error-mapper";
import { TransactionCorrectionType, TransactionType } from "@modules/transactions/domain/transaction.types";
import { NotFoundError } from "@shared/errors/domain/not-found.error";
import { AuthorizationError } from "@shared/errors/domain/authorization.error";
import { Drizzle } from "@shared/database/drizzle/client";

const transactionTypeValues = new Set(Object.values(TransactionType));
const correctionTypeValues = new Set(Object.values(TransactionCorrectionType));

const normalizeCurrencyCode = (code: string) => code.trim().toUpperCase();

@injectable()
export class CreateTransactionUseCase {
	constructor(
		@inject(TOKENS.TransactionRepository) private transactionRepository: TransactionRepository,
		@inject(TOKENS.AssetRepository) private assetRepository: AssetRepository,
		@inject(TOKENS.AccountRepository) private accountRepository: AccountRepository,
		@inject(TOKENS.Drizzle) private db: Drizzle,
	) {}

	async execute(userId: string, input: unknown) {
		if (!userId || typeof userId !== "string") {
			throw new ValidationError("Invalid user ID", "userId");
		}

		const result = CreateTransactionSchema.safeParse(input);
		if (!result.success) {
			throw new ValidationError("Invalid transaction data", undefined, undefined, {
				context: { errors: zodErrorMapper(result.error) },
			});
		}

		const data = result.data;

		if (!transactionTypeValues.has(data.transactionType as TransactionType)) {
			throw new ValidationError("Invalid transaction type", "transactionType");
		}

		if (data.correctionType && !correctionTypeValues.has(data.correctionType as TransactionCorrectionType)) {
			throw new ValidationError("Invalid correction type", "correctionType");
		}

		const currencyCode = normalizeCurrencyCode(data.currencyCode);
		const account = await this.accountRepository.findById(data.accountId);
		if (!account) {
			throw new NotFoundError(`Account ${data.accountId} not found`);
		}
		if (account.userId !== userId) {
			throw new AuthorizationError("Access denied");
		}
		const asset = await this.assetRepository.findById(data.assetId);
		if (!asset) {
			throw new NotFoundError(`Asset ${data.assetId} not found`);
		}

		const feeAsset = data.fee ? await this.assetRepository.findById(data.fee.assetId) : null;
		if (data.fee && !feeAsset) {
			throw new NotFoundError(`Asset ${data.fee.assetId} not found`);
		}

		const totalAmount = data?.unitPrice ? data.quantity * data.unitPrice : data.quantity;

		return await this.db.transaction(async (tx) => {
			const transaction = await this.transactionRepository.create(
				{
					userId,
					accountId: data.accountId,
					assetId: data.assetId,
					transactionType: data.transactionType as TransactionType,
					correctionType: (data.correctionType as TransactionCorrectionType | null) ?? null,
					referenceTxId: data.referenceTxId ?? null,
					quantity: data.quantity.toString(),
					unitPrice: data.unitPrice?.toString() ?? null,
					totalAmount: totalAmount.toString(),
					currencyCode,
					exchangeRate: data.exchangeRate?.toString() ?? null,
					transactionDate: data.transactionDate,
					notes: data.notes ?? null,
				},
				tx,
			);

			if (data.fee && feeAsset) {
				await this.transactionRepository.create(
					{
						userId,
						accountId: data.accountId,
						assetId: data.fee.assetId,
						transactionType: TransactionType.FEE,
						correctionType: null,
						referenceTxId: transaction.id,
						quantity: (-data.fee.quantity).toString(),
						unitPrice: "1",
						totalAmount: data.fee.quantity.toString(),
						currencyCode: feeAsset.symbol.trim().toUpperCase(),
						exchangeRate: null,
						transactionDate: data.transactionDate,
						notes: `Fee for transaction ${transaction.id}`,
					},
					tx,
				);
			}

			return transaction;
		});
	}
}
