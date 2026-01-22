import { PortfolioSnapshotRepository } from "@modules/portfolio-snapshots/domain/portfolio-snapshot.repository";
import {
	PerformanceInterval,
	PerformanceRange,
	PerformanceResponseDto,
} from "@modules/portfolio-snapshots/domain/portfolio-performance.types";
import { TOKENS } from "@shared/container/tokens";
import { ValidationError } from "@shared/errors/domain/validation.error";
import { zodErrorMapper } from "@shared/helpers/zod-error-mapper";
import { DateTime } from "luxon";
import { inject, injectable } from "tsyringe";
import { GetPortfolioPerformanceSchema } from "../validators/get-portfolio-performance.validator";

const RANGE_DAYS: Record<PerformanceRange, number | null> = {
	"1D": 1,
	"1W": 7,
	"1M": 30,
	"1Y": 365,
	ALL: null,
};

const DEFAULT_INTERVAL: Record<PerformanceRange, PerformanceInterval> = {
	"1D": "day",
	"1W": "day",
	"1M": "day",
	"1Y": "week",
	ALL: "month",
};

const toNumber = (value: unknown): number => {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}
	if (typeof value === "string" && value.trim().length) {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : 0;
	}
	return 0;
};

const toIsoDate = (date: DateTime, fallback: string): string => {
	return date.toISODate() ?? fallback;
};

const getWeekKey = (date: string): string => {
	const dt = DateTime.fromISO(date, { zone: "utc" });
	const weekNumber = String(dt.weekNumber).padStart(2, "0");
	return `${dt.weekYear}-W${weekNumber}`;
};

const getMonthKey = (date: string): string => {
	const dt = DateTime.fromISO(date, { zone: "utc" });
	const month = String(dt.month).padStart(2, "0");
	return `${dt.year}-${month}`;
};

const downsampleSnapshots = <T extends { snapshotDate: string }>(
	snapshots: T[],
	interval: PerformanceInterval,
): T[] => {
	if (interval === "day") {
		return snapshots;
	}

	const grouped: T[] = [];
	let currentKey: string | null = null;
	let lastSnapshot: T | null = null;

	for (const snapshot of snapshots) {
		const key = interval === "week" ? getWeekKey(snapshot.snapshotDate) : getMonthKey(snapshot.snapshotDate);
		if (currentKey === null) {
			currentKey = key;
			lastSnapshot = snapshot;
			continue;
		}

		if (key !== currentKey) {
			if (lastSnapshot) {
				grouped.push(lastSnapshot);
			}
			currentKey = key;
			lastSnapshot = snapshot;
			continue;
		}

		lastSnapshot = snapshot;
	}

	if (lastSnapshot) {
		grouped.push(lastSnapshot);
	}

	return grouped;
};

@injectable()
export class GetPortfolioPerformanceUseCase {
	constructor(
		@inject(TOKENS.PortfolioSnapshotRepository)
		private readonly portfolioSnapshotRepository: PortfolioSnapshotRepository,
	) {}

	async execute(userId: string, input: unknown): Promise<PerformanceResponseDto> {
		if (!userId || typeof userId !== "string") {
			throw new ValidationError("Invalid user ID", "userId");
		}

		const result = GetPortfolioPerformanceSchema.safeParse(input);
		if (!result.success) {
			throw new ValidationError("Invalid performance query", undefined, undefined, {
				context: { errors: zodErrorMapper(result.error) },
			});
		}

		const data = result.data;
		const range = data.range ?? "1M";
		const interval = data.interval ?? DEFAULT_INTERVAL[range];

		const latestSnapshot = await this.portfolioSnapshotRepository.findLatestByUser(userId);
		if (!latestSnapshot) {
			const today = toIsoDate(DateTime.utc(), new Date().toISOString().slice(0, 10));
			return {
				range,
				interval,
				asOfDate: today,
				points: [],
			};
		}

		const asOfDate = latestSnapshot.snapshotDate;
		const rangeDays = RANGE_DAYS[range];
		const startDate =
			rangeDays === null
				? undefined
				: toIsoDate(DateTime.fromISO(asOfDate, { zone: "utc" }).minus({ days: rangeDays }), asOfDate);

		const snapshots = await this.portfolioSnapshotRepository.findSnapshotsForPerformance(userId, startDate);
		const sampledSnapshots = downsampleSnapshots(snapshots, interval);

		return {
			range,
			interval,
			asOfDate,
			points: sampledSnapshots.map((snapshot) => ({
				date: snapshot.snapshotDate,
				valueUsd: toNumber(snapshot.totalValueUsd),
				valueBase: toNumber(snapshot.totalValueBase),
			})),
		};
	}
}
