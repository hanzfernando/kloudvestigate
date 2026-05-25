"use client";

import Link from "next/link";
import type { InvestigationMetricKey, StationMetadata } from "@/lib/telemetry-types";
import type { InvestigationResponse, MetricOption } from "./types";

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
  onRunInvestigation,
  runInvestigationBusy,
  runInvestigationDisabled,
  onQuickInvestigateEveryStation,
  quickActionBusy,
  quickActionProgress,
  quickActionResultsByStationId = {},
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
  onRunInvestigation: () => void;
  runInvestigationBusy?: boolean;
  runInvestigationDisabled?: boolean;
  onQuickInvestigateEveryStation?: () => void;
  quickActionBusy?: boolean;
  quickActionProgress?: string;
  quickActionResultsByStationId?: Record<string, InvestigationResponse>;
}) {
  const hasQuickActionResults = quickActionBusy || Object.keys(quickActionResultsByStationId).length > 0;

  return (
    <aside className="panel h-fit lg:sticky lg:top-5">
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
      <button
        className="primary-action mt-4 w-full"
        type="button"
        onClick={onRunInvestigation}
        disabled={runInvestigationBusy || runInvestigationDisabled}
      >
        {runInvestigationBusy ? "Analyzing" : "Run investigation"}
      </button>
      <QuickCommandsSection />
      {onQuickInvestigateEveryStation ? (
        <StationBatchSection
          stations={stations}
          stationId={stationId}
          onStationChange={onStationChange}
          onQuickInvestigateEveryStation={onQuickInvestigateEveryStation}
          quickActionBusy={quickActionBusy}
          quickActionProgress={quickActionProgress}
          quickActionResultsByStationId={quickActionResultsByStationId}
          hasQuickActionResults={hasQuickActionResults}
        />
      ) : null}
    </aside>
  );
}

function QuickCommandsSection() {
  return (
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
  );
}

function StationBatchSection({
  stations,
  stationId,
  onStationChange,
  onQuickInvestigateEveryStation,
  quickActionBusy,
  quickActionProgress,
  quickActionResultsByStationId,
  hasQuickActionResults,
}: {
  stations: StationMetadata[];
  stationId: string;
  onStationChange: (value: string) => void;
  onQuickInvestigateEveryStation: () => void;
  quickActionBusy?: boolean;
  quickActionProgress?: string;
  quickActionResultsByStationId: Record<string, InvestigationResponse>;
  hasQuickActionResults: boolean;
}) {
  return (
    <div className="mt-4 border-t border-[#dbe1d8] pt-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#69766d]">Station batch</p>
      <button
        className="primary-action mt-3 w-full"
        type="button"
        onClick={onQuickInvestigateEveryStation}
        disabled={quickActionBusy}
      >
        {quickActionBusy ? `Investigating every station${quickActionProgress ? ` (${quickActionProgress})` : ""}` : "Investigate every station"}
      </button>
      <p className="mt-2 text-xs leading-5 text-[#69766d]">
        Yesterday, full day, all metrics, 1-minute aggregation, throttled to 3 requests per second.
      </p>
      {hasQuickActionResults ? (
        <StationBatchSummary
          stations={stations}
          stationId={stationId}
          onStationChange={onStationChange}
          quickActionBusy={quickActionBusy}
          quickActionProgress={quickActionProgress}
          quickActionResultsByStationId={quickActionResultsByStationId}
        />
      ) : null}
    </div>
  );
}

function StationBatchSummary({
  stations,
  stationId,
  onStationChange,
  quickActionBusy,
  quickActionProgress,
  quickActionResultsByStationId,
}: {
  stations: StationMetadata[];
  stationId: string;
  onStationChange: (value: string) => void;
  quickActionBusy?: boolean;
  quickActionProgress?: string;
  quickActionResultsByStationId: Record<string, InvestigationResponse>;
}) {
  return (
    <div className="mt-4 border-t border-[#dbe1d8] pt-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#69766d]">Station summary</p>
        {quickActionProgress ? <span className="text-xs text-[#69766d]">{quickActionProgress}</span> : null}
      </div>
      <div className="mt-3 max-h-[420px] overflow-auto rounded-[6px] border border-[#dbe1d8] bg-white">
        {stations.map((station) => {
          const result = quickActionResultsByStationId[station.id];
          const counts = getStationIssueCounts(result);
          const isSelected = station.id === stationId;

          return (
            <button
              className={`grid w-full gap-2 border-b border-[#edf0ea] p-3 text-left last:border-b-0 hover:bg-[#f7f9f6] ${isSelected ? "bg-[#eef5ef]" : ""}`}
              key={station.id}
              type="button"
              onClick={() => onStationChange(station.id)}
            >
              <span className="min-w-0 truncate text-sm font-semibold text-[#26372d]">{station.name}</span>
              {result ? (
                <span className="grid grid-cols-3 gap-2 text-xs text-[#4d5d53]">
                  <IssueCount label="Missing" value={counts.missing} tone={counts.missing ? "caution" : "neutral"} />
                  <IssueCount label="Range" value={counts.outOfRange} tone={counts.outOfRange ? "danger" : "neutral"} />
                  {/* <IssueCount label="Warnings" value={counts.warnings} tone={counts.warnings ? "danger" : "neutral"} /> */}
                </span>
              ) : (
                <span className="text-xs text-[#69766d]">{quickActionBusy ? "Pending" : "No quick-action data"}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function getStationIssueCounts(result?: InvestigationResponse) {
  if (result?.metricAnalyses?.length) {
    return result.metricAnalyses.reduce(
      (counts, item) => ({
        missing: counts.missing + item.analysis.summary.missingRecordCount,
        outOfRange: counts.outOfRange + item.analysis.rangeViolations.length,
        // warnings: counts.warnings + item.analysis.thresholdCrossings.length,
      }),
      { missing: 0, outOfRange: 0 },
    );
  }

  return {
    missing: result?.analysis.summary.missingRecordCount ?? 0,
    outOfRange: result?.analysis.rangeViolations.length ?? 0,
    // warnings: result?.analysis.thresholdCrossings.length ?? 0,
  };
}

function IssueCount({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | "caution" | "danger";
}) {
  const toneClass = tone === "danger"
    ? "text-[#92351f]"
    : tone === "caution"
      ? "text-[#755010]"
      : "text-[#68766d]";

  return (
    <span className="grid gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#69766d]">{label}</span>
      <span className={`font-mono text-sm font-semibold ${toneClass}`}>{value}</span>
    </span>
  );
}
