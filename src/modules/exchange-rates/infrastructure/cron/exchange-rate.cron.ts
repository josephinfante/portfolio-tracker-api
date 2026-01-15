import { SyncExchangeRatesUseCase } from "@modules/exchange-rates/application/usecases/sync-exchange-rates.usecase";
import { UpsertExchangeRateUseCase } from "@modules/exchange-rates/application/usecases/upsert-exchange-rate.usecase";
import { logger } from "@shared/logger";
import { container } from "tsyringe";

const TIMEZONE = "America/Lima";
const SCHEDULED_TIMES = new Set(["09:00", "13:30", "18:00"]);

let lastRunKey: string | null = null;
let intervalRef: NodeJS.Timeout | null = null;

const getLimaParts = (date: Date) => {
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

export function startExchangeRateCron(): void {
	if (intervalRef) {
		return;
	}

	intervalRef = setInterval(async () => {
		const { dateKey, timeKey } = getLimaParts(new Date());

		if (!SCHEDULED_TIMES.has(timeKey)) {
			return;
		}

		const runKey = `${dateKey}-${timeKey}`;
		if (lastRunKey === runKey) {
			return;
		}

		lastRunKey = runKey;

		try {
			const syncUseCase = container.resolve(SyncExchangeRatesUseCase);
			const upsertUseCase = container.resolve(UpsertExchangeRateUseCase);

			const payload = await syncUseCase.execute();
			if (!payload) {
				logger.warn({ timeKey }, "Exchange rate sync returned no data");
				return;
			}

			await upsertUseCase.execute(payload);
			logger.info({ timeKey, source: payload.source }, "Exchange rate sync completed");
		} catch (error) {
			logger.error({ err: error, timeKey }, "Exchange rate sync failed");
		}
	}, 30_000);
}
