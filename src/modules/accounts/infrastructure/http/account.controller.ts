import { asyncHandler } from "@bootstrap/helpers/async-handler";
import { AccountService } from "@modules/accounts/application/account.service";
import { Request, Response } from "express";
import { injectable } from "tsyringe";

@injectable()
export class AccountController {
	constructor(private readonly accountService: AccountService) {}

	create = asyncHandler(async (req: Request, res: Response) => {
		const userId = res.locals.user.id;
		const response = await this.accountService.createAccount(userId, req.body);
		return res.status(201).success(response);
	});

	list = asyncHandler(async (req: Request, res: Response) => {
		const userId = res.locals.user.id;
		const { meta, ...response } = await this.accountService.listAccounts(userId, req.query);
		return res.status(200).success(response, meta);
	});

	findById = asyncHandler(async (req: Request, res: Response) => {
		const userId = res.locals.user.id;
		const id = req.params.id as string;
		const response = await this.accountService.findAccount(id, userId);
		return res.status(200).success(response);
	});

	update = asyncHandler(async (req: Request, res: Response) => {
		const userId = res.locals.user.id;
		const id = req.params.id as string;
		const response = await this.accountService.updateAccount(id, userId, req.body);
		return res.status(200).success(response);
	});

	balance = asyncHandler(async (req: Request, res: Response) => {
		const userId = res.locals.user.id;
		const id = req.params.id as string;
		const response = await this.accountService.getAccountBalance(userId, id);
		return res.status(200).success(response);
	});

	getHoldings = asyncHandler(async (req: Request, res: Response) => {
		const userId = res.locals.user.id;
		const id = req.params.id as string;
		const quoteCurrency = req.query.quoteCurrency as string | undefined;
		const response = await this.accountService.getAccountHoldings(userId, id, quoteCurrency);
		return res.status(200).success(response);
	});

	listTransactions = asyncHandler(async (req: Request, res: Response) => {
		const userId = res.locals.user.id;
		const id = req.params.id as string;
		const { meta, ...response } = await this.accountService.listAccountTransactions(userId, id, req.query);
		return res.status(200).success(response, meta);
	});

	remove = asyncHandler(async (req: Request, res: Response) => {
		const userId = res.locals.user.id;
		const id = req.params.id as string;
		await this.accountService.deleteAccount(id, userId);
		return res.status(200).success(null);
	});
}
