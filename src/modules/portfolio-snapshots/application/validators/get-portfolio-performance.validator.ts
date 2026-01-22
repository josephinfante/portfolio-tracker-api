import { z } from "zod";

export const PerformanceRangeSchema = z.enum(["1D", "1W", "1M", "1Y", "ALL"]);
export const PerformanceIntervalSchema = z.enum(["day", "week", "month"]);
export const PerformanceCurrencySchema = z.enum(["base", "usd"]);

export const GetPortfolioPerformanceSchema = z.object({
	range: PerformanceRangeSchema.optional(),
	interval: PerformanceIntervalSchema.optional(),
	currency: PerformanceCurrencySchema.optional(),
});

export type GetPortfolioPerformanceDTO = z.infer<typeof GetPortfolioPerformanceSchema>;
