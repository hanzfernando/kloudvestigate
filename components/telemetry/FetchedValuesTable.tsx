import { useMemo, useState } from "react";
import type { TelemetryAnalysis, TelemetryRecord } from "@/lib/telemetry-types";
import type { MetricInvestigationAnalysis } from "./types";
import { formatTime } from "./utils";

type TableMode = "normal" | "full" | "hidden";

export function FetchedValuesTable({
  analysis,
  records,
  metricAnalyses,
}: {
  analysis?: TelemetryAnalysis;
  records: TelemetryRecord[];
  metricAnalyses?: MetricInvestigationAnalysis[];
}) {
  const [mode, setMode] = useState<TableMode>("normal");
  const [timestampSortDirection, setTimestampSortDirection] = useState<"asc" | "desc">("asc");

  const series = useMemo(
    () => metricAnalyses?.length
      ? metricAnalyses.map((item) => ({
          metric: item.metric,
          label: item.analysis.metricProfile.label,
          records: item.records,
          rangeTimestamps: new Set(item.analysis.rangeViolations.map((violation) => violation.timestamp)),
          spikeTimestamps: new Set(item.analysis.spikes.map((spike) => spike.timestamp)),
        }))
      : analysis
        ? [{
            metric: analysis.metricProfile.metric,
            label: analysis.metricProfile.label,
            records,
            rangeTimestamps: new Set(analysis.rangeViolations.map((violation) => violation.timestamp)),
            spikeTimestamps: new Set(analysis.spikes.map((spike) => spike.timestamp)),
          }]
        : [],
    [analysis, metricAnalyses, records],
  );

  const metricCount = series.length;
  const rowCount = series.reduce((total, item) => total + item.records.length, 0);

  const groupedRows = useMemo(() => {
    const byTimestamp = new Map<string, Record<string, { value: number; range: boolean; spike: boolean }>>();

    for (const item of series) {
      for (const record of item.records) {
        const row = byTimestamp.get(record.timestamp) ?? {};
        row[item.metric] = {
          value: record.value,
          range: item.rangeTimestamps.has(record.timestamp),
          spike: item.spikeTimestamps.has(record.timestamp),
        };
        byTimestamp.set(record.timestamp, row);
      }
    }

    return [...byTimestamp.entries()]
      .sort(([a], [b]) => {
        const sort = Date.parse(a) - Date.parse(b);
        return timestampSortDirection === "asc" ? sort : -sort;
      });
  }, [series, timestampSortDirection]);

  if (mode === "hidden") {
    return (
      <button className="nav-pill w-fit" type="button" onClick={() => setMode("normal")}>
        Show fetched values
      </button>
    );
  }

  const panelClass = mode === "full"
    ? "panel fixed inset-x-4 top-4 bottom-4 z-30 overflow-hidden"
    : "panel overflow-hidden";

  return (
    <div className={panelClass}>
      <div className="flex h-full flex-col">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="panel-title">Fetched Values</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            All normalized records returned from the selected history endpoint. Outlier rows are highlighted.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="status-chip">{rowCount} rows</span>
          <span className="status-chip">{metricCount} metrics</span>
          <button className="nav-pill" type="button" onClick={() => setMode("normal")}>
            Minimize
          </button>
          <button className="nav-pill" type="button" onClick={() => setMode("full")}>
            Expand
          </button>
          <button className="nav-pill" type="button" onClick={() => setMode("hidden")}>
            Hide
          </button>
        </div>
      </div>
      <div className={`mt-3 overflow-auto ${mode === "full" ? "min-h-0 flex-1" : "max-h-105"}`}>
        <table className="ops-table">
          <thead>
            <tr>
              <th className="sticky top-0 z-10 bg-surface-table-header">
                <button
                  className="flex w-full items-center justify-between gap-2 text-left"
                  type="button"
                  onClick={() => setTimestampSortDirection((current) => (current === "asc" ? "desc" : "asc"))}
                >
                  <span>Timestamp (PH)</span>
                  <span className="font-mono text-[0.68rem]">{timestampSortDirection === "asc" ? "ASC" : "DESC"}</span>
                </button>
              </th>
              {series.map((item) => (
                <th className="sticky top-0 z-10 bg-surface-table-header" key={item.metric}>{item.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groupedRows.map(([timestamp, metricValues]) => (
              <tr key={timestamp}>
                <td className="font-mono">{formatTime(timestamp)}</td>
                {series.map((item) => {
                  const value = metricValues[item.metric];
                  if (!value) {
                    return (
                      <td key={`${timestamp}-${item.metric}`}>
                        <span className="text-chart-empty">-</span>
                      </td>
                    );
                  }

                  return (
                    <td
                      key={`${timestamp}-${item.metric}`}
                      className={
                        value.range && value.spike
                          ? "audit-cell audit-cell-both"
                          : value.range
                            ? "audit-cell audit-cell-range"
                            : value.spike
                              ? "audit-cell audit-cell-spike"
                              : "audit-cell"
                      }
                    >
                      <div className="grid gap-1">
                        <span className={value.range || value.spike ? "font-semibold" : "font-normal"}>{value.value}</span>
                        <div className="flex flex-wrap gap-1">
                          {value.range ? <span className="mini-chip mini-chip-danger">range</span> : null}
                          {value.spike ? <span className="mini-chip mini-chip-caution">jump</span> : null}
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  );
}
