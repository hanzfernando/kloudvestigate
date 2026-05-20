import type { IntervalSummary, TelemetryAnalysis } from "@/lib/telemetry-types";

export function TelemetryTimeline({
  analysis,
  sourceLabel,
}: {
  analysis?: TelemetryAnalysis;
  sourceLabel: string;
}) {
  const profile = analysis?.metricProfile;

  return (
    <div className="panel">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="panel-title">Telemetry Timeline</h2>
          <p className="text-sm text-[#5f6b63]">
            Aggregated summaries with metric-specific ranges, spike limits, warnings, and missing-data markers.
          </p>
          {profile ? (
            <p className="mt-1 text-xs text-[#6b786f]">
              Acceptable range: {profile.acceptableRange.minimum} to {profile.acceptableRange.maximum} {profile.unit};
              spike limit: {profile.spikeDelta} {profile.unit}.
            </p>
          ) : null}
        </div>
        <span className="status-chip">{sourceLabel}</span>
      </div>
      <TelemetryChart intervals={analysis?.intervals ?? []} />
    </div>
  );
}

function TelemetryChart({ intervals }: { intervals: IntervalSummary[] }) {
  const width = 920;
  const height = 260;
  const values = intervals.map((item) => item.maximum);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const points = intervals.map((item, index) => {
    const x = intervals.length <= 1 ? 0 : (index / (intervals.length - 1)) * width;
    const y = height - ((item.maximum - min) / Math.max(0.1, max - min)) * (height - 24) - 12;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="overflow-hidden rounded border border-[#dbe1d8] bg-white">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[260px] w-full" role="img" aria-label="Telemetry max value line chart">
        <rect width={width} height={height} fill="#ffffff" />
        {[0, 1, 2, 3].map((line) => (
          <line key={line} x1="0" x2={width} y1={line * 65} y2={line * 65} stroke="#e3e8df" />
        ))}
        <polyline fill="none" stroke="#2d6a4f" strokeWidth="3" points={points} />
        {intervals.map((item, index) => {
          const x = intervals.length <= 1 ? 0 : (index / (intervals.length - 1)) * width;
          const y = height - ((item.maximum - min) / Math.max(0.1, max - min)) * (height - 24) - 12;
          const color = getIntervalColor(item);
          return <circle key={item.start} cx={x} cy={y} r="4" fill={color} />;
        })}
      </svg>
    </div>
  );
}

function getIntervalColor(item: IntervalSummary) {
  if (item.dominantWarningLevel === "Critical" || item.dominantWarningLevel === "Warning") return "#b9472b";
  if (item.missingCount) return "#b7791f";
  return "#2d6a4f";
}
