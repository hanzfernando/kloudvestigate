import type { TelemetryAnalysis } from "@/lib/telemetry-types";
import type { MetricInvestigationAnalysis } from "./types";

export function SummaryStats({
  analysis,
  metricAnalyses,
}: {
  analysis?: TelemetryAnalysis;
  metricAnalyses?: MetricInvestigationAnalysis[];
}) {
  const issueCounts = getIssueCounts(analysis, metricAnalyses);

  return (
    <div className="grid gap-3 md:grid-cols-4">
      <Stat label="Average" value={analysis?.summary.average ?? 0} />
      <Stat label="Maximum" value={analysis?.summary.maximum ?? 0} emphasis={analysis?.rangeViolations.length ? "warn" : undefined} />
      <Stat label="Missing" value={issueCounts.missing} emphasis={issueCounts.missing ? "caution" : undefined} />
      <Stat label="Out of range" value={issueCounts.outOfRange} emphasis={issueCounts.outOfRange ? "danger" : undefined} />
      {/* <Stat label="Warnings" value={issueCounts.warnings} emphasis={issueCounts.warnings ? "danger" : undefined} /> */}
    </div>
  );
}

function getIssueCounts(
  analysis?: TelemetryAnalysis,
  metricAnalyses?: MetricInvestigationAnalysis[],
) {
  if (metricAnalyses?.length) {
    return metricAnalyses.reduce(
      (counts, item) => ({
        missing: counts.missing + item.analysis.summary.missingRecordCount,
        outOfRange: counts.outOfRange + item.analysis.rangeViolations.length,
        warnings: counts.warnings + item.analysis.thresholdCrossings.length,
      }),
      { missing: 0, outOfRange: 0, warnings: 0 },
    );
  }

  return {
    missing: analysis?.summary.missingRecordCount ?? 0,
    outOfRange: analysis?.rangeViolations.length ?? 0,
    warnings: analysis?.thresholdCrossings.length ?? 0,
  };
}

function Stat({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: number;
  emphasis?: "caution" | "warn" | "danger";
}) {
  const className = emphasis ? `panel stat-card stat-card-${emphasis}` : "panel stat-card";

  return (
    <div className={className}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-label">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
