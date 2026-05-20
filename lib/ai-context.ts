import type {
  InvestigationContext,
  InvestigationSelection,
  MetricKey,
  StationMetadata,
  TelemetryAnalysis,
  TelemetryRecord,
  WarningLevel,
} from "./telemetry-types";

export function buildInvestigationContext(
  station: StationMetadata,
  metric: MetricKey,
  selection: InvestigationSelection,
  analysis: TelemetryAnalysis,
  warningLevels: WarningLevel[],
  rawRecordCount: number,
): InvestigationContext {
  const payload: InvestigationContext = {
    station,
    metric,
    metricProfile: analysis.metricProfile,
    timeRange: { start: selection.start, end: selection.end },
    latestTimestamp: analysis.summary.latestTimestamp,
    summary: analysis.summary,
    spikes: analysis.spikes.slice(0, 24),
    rangeViolations: analysis.rangeViolations.slice(0, 24),
    thresholdCrossings: analysis.thresholdCrossings.slice(0, 24),
    missingPeriods: analysis.missingPeriods.slice(0, 24),
    duplicateTimestamps: analysis.duplicateTimestamps.slice(0, 24),
    flatlinePeriods: analysis.flatlinePeriods.slice(0, 12),
    intervalSummaries: analysis.intervals,
    significantReadings: {
      highest: analysis.highestReading,
      latest: analysis.latestReading,
    },
    warningLevels,
    tokenBudget: {
      strategy:
        "Raw minute telemetry omitted; context contains summaries, acceptable ranges, range violations, warnings, spikes, gaps, flatlines, and significant readings.",
      estimatedTokens: 0,
      rawRecordsOmitted: rawRecordCount,
    },
  };

  payload.tokenBudget.estimatedTokens = estimateTokens(payload);
  return payload;
}

export function buildAiPrompt(context: InvestigationContext, question: string): string {
  return [
    "You are an internal telemetry investigation copilot for operators and engineers.",
    "Use only the supplied structured telemetry context. Do not invent causes or values.",
    "Always include station, metric, selected time range, latest available timestamp, relevant timestamps, and relevant values.",
    "If the context does not support an answer, say what is missing and which deterministic data would be needed.",
    "",
    `Operator question: ${question}`,
    "",
    "Structured context:",
    JSON.stringify(context, null, 2),
  ].join("\n");
}

export function explainFindings(context: InvestigationContext, question: string): string {
  const q = question.toLowerCase();
  const latest = context.significantReadings.latest;
  const highest = context.significantReadings.highest;
  const subject = `${context.station.name} / ${context.metric}`;
  const range = `${formatTime(context.timeRange.start)} to ${formatTime(context.timeRange.end)}`;
  const profile = context.metricProfile;
  const observedRange = `${context.summary.minimum} to ${context.summary.maximum}`;
  const configuredRange = `${profile.acceptableRange.minimum} to ${profile.acceptableRange.maximum} ${profile.unit}`;

  if (q.includes("highest") || q.includes("max")) {
    return highest
      ? `${subject}: the highest reading in ${range} was ${highest.value} at ${formatTime(highest.timestamp)}. Latest available timestamp is ${formatTime(context.latestTimestamp)}.`
      : `${subject}: no readings were available in ${range}, so the highest value cannot be determined.`;
  }

  if (q.includes("missing") || q.includes("gap")) {
    if (!context.missingPeriods.length) {
      return `${subject}: no missing minute periods were detected in ${range}. Latest available timestamp is ${formatTime(context.latestTimestamp)}.`;
    }
    const first = context.missingPeriods[0];
    return `${subject}: ${context.summary.missingRecordCount} expected minute records are missing. First affected period is ${formatTime(first.start)} to ${formatTime(first.end)} (${first.missingCount} missing). Latest available timestamp is ${formatTime(context.latestTimestamp)}.`;
  }

  if (q.includes("spike") || q.includes("jump") || q.includes("unstable")) {
    if (!context.spikes.length) {
      return `${subject}: no configured spike events were detected in ${range}. Trend is ${context.summary.trend}, with observed min/max ${observedRange} and average ${context.summary.average}. Configured acceptable range is ${configuredRange}.`;
    }
    const first = context.spikes[0];
    return `${subject}: ${context.spikes.length} spike event(s) were detected using the ${first.limit} ${profile.unit} per-interval jump limit for ${profile.label}. First spike was at ${formatTime(first.timestamp)}, moving from ${first.previousValue} to ${first.currentValue} (${first.difference}). Range violations detected: ${context.rangeViolations.length}.`;
  }

  if (q.includes("range") || q.includes("acceptable") || q.includes("invalid") || q.includes("out of bounds")) {
    if (!context.rangeViolations.length) {
      return `${subject}: no acceptable-range violations were detected in ${range}. Configured acceptable range is ${configuredRange}; observed min/max were ${context.summary.minimum}/${context.summary.maximum}. Latest available timestamp is ${formatTime(context.latestTimestamp)}.`;
    }
    const first = context.rangeViolations[0];
    return `${subject}: ${context.rangeViolations.length} acceptable-range violation(s) were detected. First violation was ${first.value}, ${first.direction} the configured range ${first.minimum} to ${first.maximum}, at ${formatTime(first.timestamp)}.`;
  }

  if (q.includes("warning") || q.includes("threshold") || q.includes("critical")) {
    if (!context.thresholdCrossings.length) {
      return `${subject}: no warning-level crossings were detected in ${range}. Maximum value was ${context.summary.maximum}; latest available timestamp is ${formatTime(context.latestTimestamp)}.`;
    }
    const crossing = context.thresholdCrossings[0];
    return `${subject}: ${context.thresholdCrossings.length} warning-level crossing(s) were detected. First crossing was ${crossing.previousLevel} to ${crossing.level} at ${formatTime(crossing.timestamp)} with value ${crossing.value}.`;
  }

  if (q.includes("latest")) {
    return latest
      ? `${subject}: latest value is ${latest.value} at ${formatTime(latest.timestamp)}. Selected range is ${range}; trend is ${context.summary.trend}.`
      : `${subject}: no latest value is available for ${range}.`;
  }

  const busiest = context.intervalSummaries.reduce((top, item) => (
    !top || item.maximum > top.maximum ? item : top
  ), context.intervalSummaries[0]);

  return `${subject}: from ${range}, readings were ${context.summary.trend}. Average ${context.summary.average}, min ${context.summary.minimum}, max ${context.summary.maximum}, records ${context.summary.recordCount}/${context.summary.expectedRecordCount}. ${context.spikes.length} spike(s), ${context.rangeViolations.length} range violation(s), ${context.thresholdCrossings.length} warning crossing(s), and ${context.summary.missingRecordCount} missing expected record(s) were found. Highest interval by max was ${busiest?.label ?? "n/a"}. Latest available timestamp is ${formatTime(context.latestTimestamp)}.`;
}

export function compactSignificantReadings(records: TelemetryRecord[], maxItems = 12): TelemetryRecord[] {
  if (records.length <= maxItems) return records;
  const step = Math.max(1, Math.floor(records.length / maxItems));
  return records.filter((_, index) => index % step === 0).slice(0, maxItems);
}

function estimateTokens(value: unknown): number {
  return Math.ceil(JSON.stringify(value).length / 4);
}

function formatTime(value?: string | null): string {
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
