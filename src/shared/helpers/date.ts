import { DateTime } from "luxon";

export function getTodayInTimezone(timezone: string) {
	return DateTime.now().setZone(timezone).toISODate() ?? DateTime.now().toISODate();
}
