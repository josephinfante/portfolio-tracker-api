import { CreateTodaySnapshotUseCase } from "@modules/portfolio-snapshots/application/usecases/create-today-snapshot.usecase";
import { usersTable } from "@shared/database/drizzle/schema";
import { logger } from "@shared/logger";
import { container } from "tsyringe";
import { Drizzle } from "@shared/database/drizzle/client";
import { TOKENS } from "@shared/container/tokens";

const TIMEZONE = "America/New_York";
const SCHEDULED_TIMES = new Set(["10:00", "13:00", "16:00"]);

let lastRunKey: string | null = null;
let intervalRef: NodeJS.Timeout | null = null;

const getTimeParts = (date: Date) => {
	const formatter = new Intl.DateTimeFormat("en-GB", {
		timeZone: TIMEZONE,
		hour12: false,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	});

	const parts = formatter.formatToParts(date);
	const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? "";

	const year = pick("year");
	const month = pick("month");
	const day = pick("day");
	const hour = pick("hour");
	const minute = pick("minute");

	return {
		dateKey: `${year}-${month}-${day}`,
		timeKey: `${hour}:${minute}`,
	};
};

export function startPortfolioSnapshotCron(): void {
	if (intervalRef) {
		return;
	}

	intervalRef = setInterval(async () => {
		const { dateKey, timeKey } = getTimeParts(new Date());

		if (!SCHEDULED_TIMES.has(timeKey)) {
			return;
		}

		const runKey = `${dateKey}-${timeKey}`;
		if (lastRunKey === runKey) {
			return;
		}

		lastRunKey = runKey;

		try {
			const db = container.resolve<Drizzle>(TOKENS.Drizzle);
			const createSnapshotUseCase = container.resolve(CreateTodaySnapshotUseCase);

			const users = await db.select({ id: usersTable.id }).from(usersTable);
			if (!users.length) {
				logger.warn({ timeKey }, "Portfolio snapshot cron found no users");
				return;
			}

			let successCount = 0;
			for (const user of users) {
				try {
					await createSnapshotUseCase.execute(user.id);
					successCount += 1;
				} catch (error) {
					logger.error({ err: error, userId: user.id }, "Portfolio snapshot creation failed");
				}
			}

			logger.info({ timeKey, count: successCount }, "Portfolio snapshot cron completed");
		} catch (error) {
			logger.error({ err: error, timeKey }, "Portfolio snapshot cron failed");
		}
	}, 60_000);
}
