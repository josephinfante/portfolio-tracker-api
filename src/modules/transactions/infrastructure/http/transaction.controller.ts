import { asyncHandler } from "@bootstrap/helpers/async-handler";
import { TransactionService } from "@modules/transactions/application/transaction.service";
import { Request, Response } from "express";
import { injectable } from "tsyringe";

@injectable()
export class TransactionController {
	constructor(private readonly transactionService: TransactionService) {}

	create = asyncHandler(async (req: Request, res: Response) => {
		const userId = res.locals.user.id;
		const response = await this.transactionService.createTransaction(userId, req.body);
		return res.status(201).success(response);
	});

	list = asyncHandler(async (req: Request, res: Response) => {
		const userId = res.locals.user.id;
		const { meta, ...response } = await this.transactionService.listTransactions(userId, req.body);
		return res.status(200).success(response, meta);
	});

	findById = asyncHandler(async (req: Request, res: Response) => {
		const userId = res.locals.user.id;
		const id = req.params.id as string;
		const response = await this.transactionService.getTransactionDetails(id, userId);
		return res.status(200).success(response);
	});

	adjust = asyncHandler(async (req: Request, res: Response) => {
		const userId = res.locals.user.id;
		const id = req.params.id as string;
		const response = await this.transactionService.adjustTransaction(id, userId, req.body);
		return res.status(200).success(response);
	});

	reverse = asyncHandler(async (req: Request, res: Response) => {
		const userId = res.locals.user.id;
		const id = req.params.id as string;
		const response = await this.transactionService.reverseTransaction(id, userId, req.body);
		return res.status(200).success(response);
	});

	transfer = asyncHandler(async (req: Request, res: Response) => {
		const userId = res.locals.user.id;
		const response = await this.transactionService.transferAsset(userId, req.body);
		return res.status(201).success(response);
	});

	exchange = asyncHandler(async (req: Request, res: Response) => {
		const userId = res.locals.user.id;
		const response = await this.transactionService.exchangeAsset(userId, req.body);
		return res.status(201).success(response);
	});

	move = asyncHandler(async (req: Request, res: Response) => {
		const userId = res.locals.user.id;
		const response = await this.transactionService.moveAsset(userId, req.body);
		return res.status(201).success(response);
	});
}
