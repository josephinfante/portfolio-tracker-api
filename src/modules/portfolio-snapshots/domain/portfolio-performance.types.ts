export type PerformanceRange = "1D" | "1W" | "1M" | "1Y" | "ALL";
export type PerformanceInterval = "day" | "week" | "month";
export type PerformanceCurrency = "base" | "usd";

export interface PerformancePoint {
	date: string;
	valueUsd: number;
	valueBase: number;
}

export interface PerformanceResponseDto {
	range: PerformanceRange;
	interval: PerformanceInterval;
	asOfDate: string;
	points: PerformancePoint[];
}
