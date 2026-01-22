import { z } from "zod";

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const GetPlatformDistributionSchema = z.object({
	asOfDate: z.string().regex(isoDateRegex).optional(),
});

export type GetPlatformDistributionDTO = z.infer<typeof GetPlatformDistributionSchema>;
