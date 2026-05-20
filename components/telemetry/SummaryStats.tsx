import type { TelemetryAnalysis } from "@/lib/telemetry-types";

export function SummaryStats({ analysis }: { analysis?: TelemetryAnalysis }) {
  return (
    <div className="grid gap-3 md:grid-cols-5">
      <Stat label="Average" value={analysis?.summary.average ?? 0} />
      <Stat label="Maximum" value={analysis?.summary.maximum ?? 0} emphasis={analysis?.rangeViolations.length ? "warn" : undefined} />
      <Stat label="Missing" value={analysis?.summary.missingRecordCount ?? 0} emphasis={analysis?.summary.missingRecordCount ? "caution" : undefined} />
      <Stat label="Out of range" value={analysis?.rangeViolations.length ?? 0} emphasis={analysis?.rangeViolations.length ? "danger" : undefined} />
      <Stat label="Warnings" value={analysis?.thresholdCrossings.length ?? 0} emphasis={analysis?.thresholdCrossings.length ? "danger" : undefined} />
    </div>
  );
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
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#69766d]">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
