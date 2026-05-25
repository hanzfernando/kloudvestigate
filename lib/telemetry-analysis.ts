import type {
  DuplicateTimestamp,
  FlatlinePeriod,
  IntervalSummary,
  MetricAnalysisProfile,
  MissingPeriod,
  PointMatch,
  RangeViolation,
  SpikeEvent,
  TelemetryAnalysis,
  TelemetryRecord,
  ThresholdCrossing,
  WarningLevel,
  WarningName,
} from "./telemetry-types";
import { getMetricAnalysisProfile } from "./metric-profiles";

const minuteMs = 60_000;

export interface AnalyzeTelemetryOptions {
  start: string;
  end: string;
  aggregationMinutes: number;
  expectedIntervalMinutes?: number;
  metricProfile?: MetricAnalysisProfile;
  flatlineMinutes?: number;
  staleAfterMinutes?: number;
}

export const defaultWarningLevels: WarningLevel[] = [
  { name: "Normal", severity: 0, minValue: Number.NEGATIVE_INFINITY },
];

export function analyzeTelemetry(
  input: TelemetryRecord[],
  warningLevels: WarningLevel[] = defaultWarningLevels,
  options: AnalyzeTelemetryOptions,
): TelemetryAnalysis {
  const expectedIntervalMinutes = options.expectedIntervalMinutes ?? 1;
  const metricProfile = options.metricProfile ?? getMetricAnalysisProfile("temperature");
  const effectiveWarningLevels = metricProfile.thresholdDetection === false
    ? defaultWarningLevels
    : metricProfile.warningLevels ?? warningLevels;
  const spikeDelta = metricProfile.spikeDelta;
  const flatlineMinutes = options.flatlineMinutes ?? metricProfile.flatlineMinutes;
  const staleAfterMinutes = options.staleAfterMinutes ?? 15;
  const sorted = [...input]
    .filter((record) => Number.isFinite(record.value))
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));

  const duplicates = findDuplicateTimestamps(sorted);
  const unique = dedupeByTimestamp(sorted);
  const values = unique.map((record) => record.value);
  const latestReading = unique.at(-1) ?? null;
  const highestReading = unique.reduce<TelemetryRecord | null>(
    (highest, record) => (!highest || record.value > highest.value ? record : highest),
    null,
  );

  const missingPeriods = findMissingPeriods(
    unique,
    options.start,
    options.end,
    expectedIntervalMinutes,
  );
  const spikes = metricProfile.spikeDetection === false ? [] : findSpikes(unique, spikeDelta);
  const rangeViolations = findRangeViolations(unique, metricProfile);
  const thresholdCrossings = metricProfile.thresholdDetection === false
    ? []
    : findThresholdCrossings(unique, effectiveWarningLevels);
  const flatlinePeriods = findFlatlines(unique, flatlineMinutes);
  const intervals = buildIntervalSummaries(
    unique,
    effectiveWarningLevels,
    options.start,
    options.end,
    options.aggregationMinutes,
    expectedIntervalMinutes,
  );

  const expectedRecordCount = countExpectedRecords(
    options.start,
    options.end,
    expectedIntervalMinutes,
  );
  const average = values.length ? round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
  const firstValue = values[0] ?? 0;
  const lastValue = values.at(-1) ?? 0;

  return {
    summary: {
      average,
      minimum: values.length ? round(Math.min(...values)) : 0,
      maximum: values.length ? round(Math.max(...values)) : 0,
      firstValue: round(firstValue),
      lastValue: round(lastValue),
      latestTimestamp: latestReading?.timestamp ?? null,
      recordCount: unique.length,
      expectedRecordCount,
      missingRecordCount: Math.max(0, expectedRecordCount - unique.length),
      trend: determineTrend(firstValue, lastValue),
      stale: latestReading
        ? Date.parse(options.end) - Date.parse(latestReading.timestamp) > staleAfterMinutes * minuteMs
        : true,
    },
    metricProfile,
    intervals,
    spikes,
    rangeViolations,
    thresholdCrossings,
    missingPeriods,
    duplicateTimestamps: duplicates,
    flatlinePeriods,
    highestReading,
    latestReading,
  };
}

export function findPointInTime(
  records: TelemetryRecord[],
  requestedTimestamp: string,
): PointMatch | null {
  if (!records.length) return null;

  const sorted = [...records].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  const requested = Date.parse(requestedTimestamp);
  let nearest = sorted[0];
  let nearestDelta = Math.abs(Date.parse(nearest.timestamp) - requested);

  for (const record of sorted) {
    const delta = Math.abs(Date.parse(record.timestamp) - requested);
    if (delta < nearestDelta) {
      nearest = record;
      nearestDelta = delta;
    }
  }

  return {
    requestedTimestamp,
    matchedTimestamp: nearest.timestamp,
    value: round(nearest.value),
    matchType: nearestDelta === 0 ? "exact" : "nearest",
    deltaMinutes: Math.round(nearestDelta / minuteMs),
  };
}

function buildIntervalSummaries(
  records: TelemetryRecord[],
  warningLevels: WarningLevel[],
  start: string,
  end: string,
  aggregationMinutes: number,
  expectedIntervalMinutes: number,
): IntervalSummary[] {
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  const bucketMs = aggregationMinutes * minuteMs;
  const summaries: IntervalSummary[] = [];

  for (let bucketStart = startMs; bucketStart < endMs; bucketStart += bucketMs) {
    const bucketEnd = Math.min(bucketStart + bucketMs, endMs);
    const bucketRecords = records.filter((record) => {
      const time = Date.parse(record.timestamp);
      return time >= bucketStart && time < bucketEnd;
    });

    if (!bucketRecords.length) {
      summaries.push({
        start: new Date(bucketStart).toISOString(),
        end: new Date(bucketEnd).toISOString(),
        label: formatBucketLabel(bucketStart, aggregationMinutes),
        average: 0,
        minimum: 0,
        maximum: 0,
        firstValue: 0,
        lastValue: 0,
        recordCount: 0,
        missingCount: countExpectedRecords(
          new Date(bucketStart).toISOString(),
          new Date(bucketEnd).toISOString(),
          expectedIntervalMinutes,
        ),
        trend: "stable",
        dominantWarningLevel: "Normal",
      });
      continue;
    }

    const values = bucketRecords.map((record) => record.value);
    const warningCounts = bucketRecords.reduce<Record<WarningName, number>>(
      (counts, record) => {
        const level = getWarningLevel(record.value, warningLevels).name;
        counts[level] = (counts[level] ?? 0) + 1;
        return counts;
      },
      { Normal: 0, Advisory: 0, Watch: 0, Warning: 0, Critical: 0 },
    );

    summaries.push({
      start: new Date(bucketStart).toISOString(),
      end: new Date(bucketEnd).toISOString(),
      label: formatBucketLabel(bucketStart, aggregationMinutes),
      average: round(values.reduce((sum, value) => sum + value, 0) / values.length),
      minimum: round(Math.min(...values)),
      maximum: round(Math.max(...values)),
      firstValue: round(values[0]),
      lastValue: round(values.at(-1) ?? values[0]),
      recordCount: bucketRecords.length,
      missingCount: Math.max(
        0,
        countExpectedRecords(
          new Date(bucketStart).toISOString(),
          new Date(bucketEnd).toISOString(),
          expectedIntervalMinutes,
        ) - bucketRecords.length,
      ),
      trend: determineTrend(values[0], values.at(-1) ?? values[0]),
      dominantWarningLevel: Object.entries(warningCounts).sort((a, b) => b[1] - a[1])[0][0] as WarningName,
    });
  }

  return summaries;
}

function findSpikes(records: TelemetryRecord[], spikeDelta: number): SpikeEvent[] {
  const spikes: SpikeEvent[] = [];
  for (let index = 1; index < records.length; index += 1) {
    const previous = records[index - 1];
    const current = records[index];
    const difference = current.value - previous.value;
    if (Math.abs(difference) >= spikeDelta) {
      spikes.push({
        timestamp: current.timestamp,
        previousTimestamp: previous.timestamp,
        previousValue: round(previous.value),
        currentValue: round(current.value),
        difference: round(difference),
        limit: spikeDelta,
      });
    }
  }
  return spikes;
}

function findRangeViolations(
  records: TelemetryRecord[],
  profile: MetricAnalysisProfile,
): RangeViolation[] {
  return records
    .filter((record) => (
      record.value < profile.acceptableRange.minimum ||
      record.value > profile.acceptableRange.maximum
    ))
    .map((record) => ({
      timestamp: record.timestamp,
      value: round(record.value),
      minimum: profile.acceptableRange.minimum,
      maximum: profile.acceptableRange.maximum,
      direction: record.value < profile.acceptableRange.minimum ? "below" : "above",
    }));
}

function findThresholdCrossings(
  records: TelemetryRecord[],
  warningLevels: WarningLevel[],
): ThresholdCrossing[] {
  const crossings: ThresholdCrossing[] = [];
  let previousLevel = records[0] ? getWarningLevel(records[0].value, warningLevels).name : "Normal";

  for (const record of records.slice(1)) {
    const currentLevel = getWarningLevel(record.value, warningLevels).name;
    if (currentLevel !== previousLevel) {
      crossings.push({
        timestamp: record.timestamp,
        previousLevel,
        level: currentLevel,
        value: round(record.value),
      });
      previousLevel = currentLevel;
    }
  }

  return crossings;
}

function findMissingPeriods(
  records: TelemetryRecord[],
  start: string,
  end: string,
  expectedIntervalMinutes: number,
): MissingPeriod[] {
  const present = new Set(records.map((record) => Date.parse(record.timestamp)));
  const periods: MissingPeriod[] = [];
  let currentStart: number | null = null;
  let currentEnd: number | null = null;
  let missingCount = 0;

  for (let time = Date.parse(start); time <= Date.parse(end); time += expectedIntervalMinutes * minuteMs) {
    if (!present.has(time)) {
      currentStart ??= time;
      currentEnd = time;
      missingCount += 1;
      continue;
    }

    if (currentStart !== null && currentEnd !== null) {
      periods.push({
        start: new Date(currentStart).toISOString(),
        end: new Date(currentEnd).toISOString(),
        missingCount,
      });
    }
    currentStart = null;
    currentEnd = null;
    missingCount = 0;
  }

  if (currentStart !== null && currentEnd !== null) {
    periods.push({
      start: new Date(currentStart).toISOString(),
      end: new Date(currentEnd).toISOString(),
      missingCount,
    });
  }

  return periods;
}

function findDuplicateTimestamps(records: TelemetryRecord[]): DuplicateTimestamp[] {
  const counts = new Map<string, number>();
  for (const record of records) counts.set(record.timestamp, (counts.get(record.timestamp) ?? 0) + 1);
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([timestamp, count]) => ({ timestamp, count }));
}

function findFlatlines(records: TelemetryRecord[], flatlineMinutes: number): FlatlinePeriod[] {
  const periods: FlatlinePeriod[] = [];
  let runStart = 0;

  for (let index = 1; index <= records.length; index += 1) {
    const previous = records[index - 1];
    const current = records[index];
    if (current && current.value === previous.value) continue;

    const runLength = index - runStart;
    if (runLength >= flatlineMinutes) {
      periods.push({
        start: records[runStart].timestamp,
        end: previous.timestamp,
        value: round(previous.value),
        durationMinutes: runLength,
      });
    }
    runStart = index;
  }

  return periods;
}

function dedupeByTimestamp(records: TelemetryRecord[]): TelemetryRecord[] {
  const byTimestamp = new Map<string, TelemetryRecord>();
  for (const record of records) byTimestamp.set(record.timestamp, record);
  return [...byTimestamp.values()].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
}

function countExpectedRecords(start: string, end: string, expectedIntervalMinutes: number): number {
  const totalMinutes = Math.max(0, Math.floor((Date.parse(end) - Date.parse(start)) / minuteMs));
  return Math.floor(totalMinutes / expectedIntervalMinutes) + 1;
}

function getWarningLevel(value: number, warningLevels: WarningLevel[]): WarningLevel {
  return [...warningLevels]
    .sort((a, b) => b.severity - a.severity)
    .find((level) => value >= level.minValue) ?? warningLevels[0];
}

function determineTrend(first: number, last: number): "increasing" | "decreasing" | "stable" {
  const difference = last - first;
  if (Math.abs(difference) < 0.05) return "stable";
  return difference > 0 ? "increasing" : "decreasing";
}

function formatBucketLabel(bucketStart: number, aggregationMinutes: number): string {
  const date = new Date(bucketStart);
  if (aggregationMinutes >= 1440) return date.toISOString().slice(0, 10);
  return date.toISOString().slice(11, 16);
}

function round(value: number): number {
  return Number(value.toFixed(2));
}
