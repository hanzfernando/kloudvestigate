import type {
  InvestigationContext,
  InvestigationSelection,
  MetricKey,
  PointMatch,
  StationMetadata,
  TelemetryAnalysis,
  TelemetryRecord,
} from "@/lib/telemetry-types";

export type SortKey = "timestamp" | "value" | "id";

export type SortDirection = "asc" | "desc";

export type SourceKind = "demo" | "kloudtrack";

export interface MetricOption {
  label: string;
  value: MetricKey;
}

export interface StationsResponse {
  stations: StationMetadata[];
  source: SourceKind;
  reason?: string;
  error?: string;
  message?: string;
}

export interface InvestigationResponse {
  selection: InvestigationSelection;
  station: StationMetadata;
  analysis: TelemetryAnalysis;
  context: InvestigationContext;
  prompt: string | null;
  pointMatch: PointMatch | null;
  answer: string | null;
  aiProvider: "gemini" | "deterministic" | null;
  aiError?: string;
  records: TelemetryRecord[];
  source: SourceKind;
}
