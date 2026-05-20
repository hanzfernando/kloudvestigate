import type { MetricOption } from "./types";
import { allMetricKeys, getMetricAnalysisProfile } from "@/lib/metric-profiles";

export const metrics: MetricOption[] = [
  { label: "All", value: "all" },
  ...allMetricKeys.map((metric) => ({
    label: getMetricAnalysisProfile(metric).label,
    value: metric,
  })),
];

export const questions = [
  "Summarize the trend from the selected range.",
  "What timestamps did the data spike?",
  "Did the station cross warning thresholds?",
  "Were there missing telemetry records?",
  "Which hour had the highest reading?",
];
