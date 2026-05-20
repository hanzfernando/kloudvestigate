import type {
  RangeViolation,
  SpikeEvent,
  TelemetryAnalysis,
  TelemetryRecord,
} from "@/lib/telemetry-types";
import type { SortDirection, SortKey } from "./types";

export function toInputValue(date: Date) {
  return date.toISOString().slice(0, 16);
}

export function formatTime(value?: string | null) {
  if (!value) return "n/a";
  return new Date(value).toISOString().slice(0, 16).replace("T", " ");
}

export function sortRecords(
  records: TelemetryRecord[],
  sortKey: SortKey,
  sortDirection: SortDirection,
) {
  const sorted = [...records];
  sorted.sort((a, b) => {
    const multiplier = sortDirection === "asc" ? 1 : -1;
    if (sortKey === "timestamp") {
      return (Date.parse(a.timestamp) - Date.parse(b.timestamp)) * multiplier;
    }
    if (sortKey === "id") {
      return ((a.id ?? 0) - (b.id ?? 0)) * multiplier;
    }
    return (a.value - b.value) * multiplier;
  });
  return sorted;
}

export function rankRangeViolations(violations: RangeViolation[]) {
  return [...violations].sort((a, b) => violationDistance(b) - violationDistance(a));
}

export function rankSpikes(spikes: SpikeEvent[]) {
  return [...spikes].sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));
}

export function getOutlierSets(analysis?: TelemetryAnalysis) {
  return {
    rangeTimestamps: new Set((analysis?.rangeViolations ?? []).map((item) => item.timestamp)),
    spikeTimestamps: new Set((analysis?.spikes ?? []).map((item) => item.timestamp)),
  };
}

function violationDistance(violation: RangeViolation) {
  if (violation.direction === "above") return violation.value - violation.maximum;
  return violation.minimum - violation.value;
}
