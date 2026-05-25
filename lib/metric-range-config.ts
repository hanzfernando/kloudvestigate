import type { MetricKey } from "./telemetry-types";

export type MetricRange = {
  minimum: number;
  maximum: number;
};

export type MetricRangeOverrides = Partial<Record<MetricKey, MetricRange>>;

export const METRIC_RANGE_OVERRIDES_COOKIE = "kloudvestigate.metric-range-overrides";

export function normalizeMetricRangeOverrides(input: unknown): MetricRangeOverrides {
  if (!input || typeof input !== "object") return {};

  const result: MetricRangeOverrides = {};

  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (!isMetricKey(key) || !value || typeof value !== "object") continue;

    const minimum = Number((value as { minimum?: unknown }).minimum);
    const maximum = Number((value as { maximum?: unknown }).maximum);

    if (!Number.isFinite(minimum) || !Number.isFinite(maximum) || minimum > maximum) continue;

    result[key] = { minimum, maximum };
  }

  return result;
}

export function parseMetricRangeOverrides(raw: string | null | undefined): MetricRangeOverrides {
  if (!raw) return {};

  try {
    return normalizeMetricRangeOverrides(JSON.parse(raw));
  } catch {
    return {};
  }
}

export function serializeMetricRangeOverrides(overrides: MetricRangeOverrides): string {
  return JSON.stringify(normalizeMetricRangeOverrides(overrides));
}

function isMetricKey(value: string): value is MetricKey {
  return [
    "temperature",
    "humidity",
    "pressure",
    "heatIndex",
    "windDirection",
    "windSpeed",
    "precipitation",
    "rainfall",
    "uvIndex",
    "lightIntensity",
  ].includes(value);
}