import type {
  RangeViolation,
  SpikeEvent,
  TelemetryAnalysis,
  TelemetryRecord,
} from "@/lib/telemetry-types";
import type { SortDirection, SortKey } from "./types";

const philippineOffsetMs = 8 * 60 * 60_000;

export function toInputValue(date: Date) {
  return new Date(date.getTime() + philippineOffsetMs).toISOString().slice(0, 16);
}

export function phtDayBoundaryToUtcISOString(dayOffset: number) {
  const phtNow = new Date(Date.now() + philippineOffsetMs);
  phtNow.setUTCHours(0, 0, 0, 0);
  phtNow.setUTCDate(phtNow.getUTCDate() + dayOffset);
  return new Date(phtNow.getTime() - philippineOffsetMs).toISOString();
}

export function philippineInputToUtcISOString(value: string) {
  const inputWithSeconds = value.length === 16 ? `${value}:00` : value;
  return new Date(`${inputWithSeconds}+08:00`).toISOString();
}

export function formatTime(value?: string | null) {
  if (!value) return "n/a";
  const parts = new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Manila",
  }).formatToParts(new Date(value));
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day} ${byType.hour}:${byType.minute} PHT`;
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
