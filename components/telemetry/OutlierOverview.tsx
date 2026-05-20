import type { TelemetryAnalysis } from "@/lib/telemetry-types";
import { formatTime, rankRangeViolations, rankSpikes } from "./utils";

export function OutlierOverview({ analysis }: { analysis?: TelemetryAnalysis }) {
  const rangeOutliers = rankRangeViolations(analysis?.rangeViolations ?? []).slice(0, 5);
  const spikeOutliers = rankSpikes(analysis?.spikes ?? []).slice(0, 5);

  return (
    <div className="panel">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="panel-title">Outlier Review</h2>
          <p className="mt-1 text-sm text-[#5f6b63]">
            Worst range violations and largest jumps, ranked for quick operational review.
          </p>
        </div>
        <span className="status-chip">
          {(analysis?.rangeViolations.length ?? 0) + (analysis?.spikes.length ?? 0)} signals
        </span>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <OutlierColumn
          title="Largest Range Violations"
          empty="No values outside the configured range."
          items={rangeOutliers.map((item) => ({
            time: formatTime(item.timestamp),
            value: `${item.value}`,
            detail: `${item.direction} ${item.minimum} to ${item.maximum}`,
            severity: item.direction === "above"
              ? item.value - item.maximum
              : item.minimum - item.value,
          }))}
        />
        <OutlierColumn
          title="Largest Jumps"
          empty="No jump events beyond the metric limit."
          items={spikeOutliers.map((item) => ({
            time: formatTime(item.timestamp),
            value: `${item.currentValue}`,
            detail: `${item.previousValue} to ${item.currentValue}; delta ${item.difference}`,
            severity: Math.abs(item.difference),
          }))}
        />
      </div>
    </div>
  );
}

function OutlierColumn({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: Array<{ time: string; value: string; detail: string; severity: number }>;
}) {
  const maxSeverity = Math.max(...items.map((item) => item.severity), 1);

  return (
    <div className="rounded border border-[#dbe1d8] bg-white p-3">
      <h3 className="text-sm font-semibold text-[#26372d]">{title}</h3>
      <div className="mt-3 grid gap-2">
        {items.length ? items.map((item) => (
          <div className="outlier-row" key={`${item.time}-${item.value}-${item.detail}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-sm">{item.time}</p>
                <p className="mt-1 text-sm text-[#5f6b63]">{item.detail}</p>
              </div>
              <strong>{item.value}</strong>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded bg-[#edf0ea]">
              <div
                className="h-full rounded bg-[#b9472b]"
                style={{ width: `${Math.max(8, (item.severity / maxSeverity) * 100)}%` }}
              />
            </div>
          </div>
        )) : <p className="text-sm text-[#5f6b63]">{empty}</p>}
      </div>
    </div>
  );
}
