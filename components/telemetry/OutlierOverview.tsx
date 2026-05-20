import type { RangeViolation, SpikeEvent, TelemetryAnalysis } from "@/lib/telemetry-types";
import { formatTime, rankRangeViolations, rankSpikes } from "./utils";

export function OutlierOverview({ analysis }: { analysis?: TelemetryAnalysis }) {
  const rangeOutliers = rankRangeViolations(analysis?.rangeViolations ?? []);
  const spikeOutliers = rankSpikes(analysis?.spikes ?? []).slice(0, 5);
  const profile = analysis?.metricProfile;

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="panel-title">Acceptable Range Audit</h2>
          <p className="mt-1 text-sm text-[#5f6b63]">
            Exact timestamps and readings outside the configured range, ready for deletion review.
          </p>
        </div>
        <span className="status-chip">
          {analysis?.rangeViolations.length ?? 0} range flags
        </span>
      </div>

      {profile ? (
        <p className="mt-3 text-sm text-[#5f6b63]">
          Accepted range: {profile.acceptableRange.minimum} to {profile.acceptableRange.maximum} {profile.unit}
        </p>
      ) : null}

      <RangeViolationTable items={rangeOutliers} />

      <div className="mt-5 border-t border-[#dbe1d8] pt-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-[#26372d]">Largest Jumps</h3>
          <span className="count-chip count-chip-caution">{analysis?.spikes.length ?? 0}</span>
        </div>
        <JumpTable items={spikeOutliers} />
      </div>
    </div>
  );
}

function RangeViolationTable({ items }: { items: RangeViolation[] }) {
  if (!items.length) {
    return <p className="mt-4 text-sm text-[#5f6b63]">No readings outside the configured acceptable range.</p>;
  }

  return (
    <div className="mt-4 max-h-[420px] overflow-auto">
      <table className="ops-table min-w-[860px]">
        <thead>
          <tr>
            <th>Timestamp (PH)</th>
            <th>Reading</th>
            <th>Accepted Range</th>
            <th>Direction</th>
            <th>Difference</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const difference = item.direction === "above"
              ? item.value - item.maximum
              : item.minimum - item.value;

            return (
              <tr className="row-outlier" key={`${item.timestamp}-${item.value}-${item.minimum}-${item.maximum}`}>
                <td className="font-mono">{formatTime(item.timestamp)}</td>
                <td className="font-semibold">{item.value}</td>
                <td>{item.minimum} to {item.maximum}</td>
                <td>{item.direction}</td>
                <td>{difference}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function JumpTable({ items }: { items: SpikeEvent[] }) {
  if (!items.length) {
    return <p className="mt-3 text-sm text-[#5f6b63]">No jump events beyond the metric limit.</p>;
  }

  return (
    <div className="mt-3 overflow-auto">
      <table className="ops-table min-w-[760px]">
        <thead>
          <tr>
            <th>Timestamp (PH)</th>
            <th>Reading</th>
            <th>Previous Reading</th>
            <th>Delta</th>
            <th>Limit</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr className="row-spike" key={`${item.timestamp}-${item.previousTimestamp}-${item.currentValue}`}>
              <td className="font-mono">{formatTime(item.timestamp)}</td>
              <td className="font-semibold">{item.currentValue}</td>
              <td>{item.previousValue}</td>
              <td>{item.difference}</td>
              <td>{item.limit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
