import Link from "next/link";
import type { InvestigationMetricKey, StationMetadata } from "@/lib/telemetry-types";
import type { MetricOption } from "./types";

const quickCommands: Array<{ label: string; href: string }> = [
  { label: "Get Pubmat Heat Index (2PM)", href: "/pubmat?metric=heatIndex&interval=60&run=1" },
  { label: "Get Pubmat Temperature (2PM)", href: "/pubmat?metric=temperature&interval=60&run=1" },
  // { label: "Get Pubmat Rainfall (2PM)", href: "/pubmat?metric=rainfall&interval=60&run=1" },
  // { label: "Get Pubmat All Metrics (2PM)", href: "/pubmat?metric=all&interval=60&run=1" },
];

export function InvestigationScopePanel({
  stations,
  stationId,
  metric,
  metrics,
  start,
  end,
  aggregationMinutes,
  onStationChange,
  onMetricChange,
  onStartChange,
  onEndChange,
  onAggregationChange,
}: {
  stations: StationMetadata[];
  stationId: string;
  metric: InvestigationMetricKey;
  metrics: MetricOption[];
  start: string;
  end: string;
  aggregationMinutes: number;
  onStationChange: (value: string) => void;
  onMetricChange: (value: InvestigationMetricKey) => void;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  onAggregationChange: (value: number) => void;
}) {
  return (
    <aside className="panel h-fit">
      <h2 className="panel-title">Investigation Scope</h2>
      <label className="field-label">
        Station
        <select className="field" value={stationId} onChange={(event) => onStationChange(event.target.value)}>
          {stations.length ? stations.map((station) => (
            <option key={station.id} value={station.id}>{station.name}</option>
          )) : (
            <option value={stationId}>Loading stations</option>
          )}
        </select>
      </label>
      <label className="field-label">
        Metric
        <select className="field" value={metric} onChange={(event) => onMetricChange(event.target.value as InvestigationMetricKey)}>
          {metrics.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </label>
      <label className="field-label">
        Start (PH)
        <input className="field" type="datetime-local" value={start} onChange={(event) => onStartChange(event.target.value)} />
      </label>
      <label className="field-label">
        End (PH)
        <input className="field" type="datetime-local" value={end} onChange={(event) => onEndChange(event.target.value)} />
      </label>
      <label className="field-label">
        Aggregation
        <select className="field" value={aggregationMinutes} onChange={(event) => onAggregationChange(Number(event.target.value))}>
          <option value={1}>1 minute</option>
          <option value={15}>15 minutes</option>
          <option value={30}>30 minutes</option>
          <option value={60}>1 hour</option>
          <option value={360}>6 hours</option>
          <option value={720}>12 hours</option>
          <option value={1440}>Daily</option>
        </select>
      </label>
      <div className="mt-4 border-t border-[#dbe1d8] pt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#69766d]">Quick commands</p>
        <div className="mt-3 grid gap-2">
          {quickCommands.map((item) => (
            <Link className="question-button" href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}
