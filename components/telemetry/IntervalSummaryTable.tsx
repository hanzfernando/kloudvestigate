import type { TelemetryAnalysis } from "@/lib/telemetry-types";

export function IntervalSummaryTable({ analysis }: { analysis?: TelemetryAnalysis }) {
  return (
    <div className="panel overflow-hidden">
      <h2 className="panel-title">Interval Summary</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="ops-table">
          <thead>
            <tr>
              <th>Interval</th>
              <th>Avg</th>
              <th>Min</th>
              <th>Max</th>
              <th>Records</th>
              <th>Trend</th>
              <th>Warning</th>
            </tr>
          </thead>
          <tbody>
            {(analysis?.intervals ?? []).slice(0, 12).map((item) => (
              <tr key={item.start}>
                <td>{item.label}</td>
                <td>{item.average}</td>
                <td>{item.minimum}</td>
                <td>{item.maximum}</td>
                <td>{item.recordCount}</td>
                <td>{item.trend}</td>
                <td>{item.dominantWarningLevel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
