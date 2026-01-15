import { TransactionRepository } from "@modules/transactions/domain/transaction.repository";
import { TOKENS } from "@shared/container/tokens";
import { inject, injectable } from "tsyringe";
import { AdjustTransactionSchema } from "../validators/adjust-transaction.validator";
import { ValidationError } from "@shared/errors/domain/validation.error";
import { zodErrorMapper } from "@shared/helpers/zod-error-mapper";
import { NotFoundError } from "@shared/errors/domain/not-found.error";
import { AuthorizationError } from "@shared/errors/domain/authorization.error";
import { TransactionCorrectionType, TransactionType } from "@modules/transactions/domain/transaction.types";

const correctionTypeValues = new Set(Object.values(TransactionCorrectionType));

@injectable()
export class AdjustTransactionUseCase {
	constructor(@inject(TOKENS.TransactionRepository) private transactionRepository: TransactionRepository) {}

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
			data.quantity = (data.quantity as number).toString();
		}

		if (data.unitPrice !== undefined) {
			data.unitPrice = data.unitPrice === null ? null : (data.unitPrice as number).toString();
		}

		if (data.totalAmount !== undefined) {
			data.totalAmount = (data.totalAmount as number).toString();
		}

		if (data.exchangeRate !== undefined) {
			data.exchangeRate = data.exchangeRate === null ? null : (data.exchangeRate as number).toString();
		}

		const current = {
			...transaction,
		};

		const quantity = Number(data?.quantity ?? current.quantity);
		const unitPrice = Number(data?.unitPrice ?? current.unitPrice);
		const totalAmount = unitPrice ? quantity * unitPrice : quantity;

		return await this.transactionRepository.create({
			userId,
			accountId: current.accountId,
			assetId: current.assetId,
			transactionType: current.transactionType as TransactionType,
			correctionType: (data.correctionType as TransactionCorrectionType | null) ?? TransactionCorrectionType.ADJUST,
			referenceTxId: id,
			quantity: quantity.toString(),
			unitPrice: unitPrice.toString(),
			totalAmount: totalAmount.toString(),
			currencyCode: current.currencyCode,
			exchangeRate: data?.exchangeRate?.toString() ?? null,
			transactionDate: (data?.transactionDate as number) ?? current.transactionDate,
			notes: (data?.notes as string) || (data?.reason as string) || null,
		});
	}
}
