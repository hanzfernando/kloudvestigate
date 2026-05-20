import type { TelemetryRecord } from "@/lib/telemetry-types";
import type { SortDirection, SortKey } from "./types";
import { formatTime } from "./utils";

export function FetchedValuesTable({
  records,
  sortKey,
  sortDirection,
  rangeTimestamps,
  spikeTimestamps,
  onSort,
}: {
  records: TelemetryRecord[];
  sortKey: SortKey;
  sortDirection: SortDirection;
  rangeTimestamps: Set<string>;
  spikeTimestamps: Set<string>;
  onSort: (key: SortKey) => void;
}) {
  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="panel-title">Fetched Values</h2>
          <p className="mt-1 text-sm text-[#5f6b63]">
            Normalized records returned from the selected history endpoint. Outlier rows are highlighted.
          </p>
        </div>
        <span className="status-chip">{records.length} rows</span>
      </div>
      <div className="mt-3 max-h-[420px] overflow-auto">
        <table className="ops-table">
          <thead>
            <tr>
              <SortableHeader label="Timestamp (PH)" sortKey="timestamp" activeKey={sortKey} direction={sortDirection} onSort={onSort} />
              <SortableHeader label="Value" sortKey="value" activeKey={sortKey} direction={sortDirection} onSort={onSort} />
              <SortableHeader label="Record ID" sortKey="id" activeKey={sortKey} direction={sortDirection} onSort={onSort} />
              <th>Flags</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record, index) => {
              const rangeOutlier = rangeTimestamps.has(record.timestamp);
              const spike = spikeTimestamps.has(record.timestamp);
              const className = rangeOutlier ? "row-outlier" : spike ? "row-spike" : undefined;

              return (
                <tr key={`${record.timestamp}-${record.id ?? index}`} className={className}>
                  <td className="font-mono">{formatTime(record.timestamp)}</td>
                  <td>{record.value}</td>
                  <td className="font-mono">{record.id ?? "n/a"}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {rangeOutlier ? <span className="mini-chip mini-chip-danger">range</span> : null}
                      {spike ? <span className="mini-chip mini-chip-caution">jump</span> : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SortableHeader({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  direction: SortDirection;
  onSort: (key: SortKey) => void;
}) {
  const active = activeKey === sortKey;

  return (
    <th>
      <button
        className="flex w-full items-center justify-between gap-2 text-left"
        type="button"
        onClick={() => onSort(sortKey)}
      >
        <span>{label}</span>
        <span className="font-mono text-[0.68rem]">{active ? (direction === "asc" ? "ASC" : "DESC") : "SORT"}</span>
      </button>
    </th>
  );
}
