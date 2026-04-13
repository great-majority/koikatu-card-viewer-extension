export const HONEYCOME_SERIES_TARGETS = ["HC", "SV", "AC"] as const;

export type HoneycomeSeriesTarget = (typeof HONEYCOME_SERIES_TARGETS)[number];

export type HoneycomeSeriesCounts = Record<HoneycomeSeriesTarget, number>;

const HEADER_TO_TARGET: Record<string, HoneycomeSeriesTarget> = {
	"【HCChara】": "HC",
	"【HCPChara】": "HC",
	"【DCChara】": "HC",
	"【SVChara】": "SV",
	"【ACChara】": "AC",
};

const TARGET_LABELS: Record<HoneycomeSeriesTarget, string> = {
	HC: "Honeycome",
	SV: "SummerVacationScramble",
	AC: "Aicomi",
};

export function createEmptyHoneycomeSeriesCounts(): HoneycomeSeriesCounts {
	return {
		HC: 0,
		SV: 0,
		AC: 0,
	};
}

export function honeycomeSeriesFromHeader(
	header: string | undefined,
): HoneycomeSeriesTarget | null {
	if (!header) return null;
	return HEADER_TO_TARGET[header] ?? null;
}

export function honeycomeSeriesLabel(target: HoneycomeSeriesTarget): string {
	return TARGET_LABELS[target];
}
