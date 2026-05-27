import type { TelemetryAnalysis } from "@/lib/telemetry-types";
import { EventList } from "./EventList";
import { formatTime } from "./utils";
import type { MetricInvestigationAnalysis } from "./types";
import { useState } from "react";

interface EventsPanelProps {
  analysis?: TelemetryAnalysis;
  metricAnalyses?: MetricInvestigationAnalysis[];
}

export function EventsPanel({ analysis, metricAnalyses }: EventsPanelProps) {
  const [activeMetric, setActiveMetric] = useState<string | null>(null);
  const [showLists, setShowLists] = useState(true);
  const [totalsExpanded, setTotalsExpanded] = useState(false);
  const [hideSingleMissingRecords, setHideSingleMissingRecords] = useState(false);

  const analyses = metricAnalyses?.length
    ? metricAnalyses
    : analysis
      ? [{ metric: analysis.metricProfile.metric, analysis, records: [] }]
      : [];

  if (!analyses.length) return null;

  const active = analyses.find(a => a.metric === (activeMetric ?? analyses[0].metric))
    ?? analyses[0];

  const activeSpikes = active.analysis.spikes.length;
  const activeViolations = active.analysis.rangeViolations.length;
  const activeMissing = active.analysis.missingPeriods.length;
  const activeDuplicates = active.analysis.duplicateTimestamps.length;
  const activeQuality = activeMissing + activeDuplicates;
  const activeTotal = activeSpikes + activeViolations + activeQuality;
  const visibleMissingPeriods = hideSingleMissingRecords
    ? active.analysis.missingPeriods.filter((item) => item.missingCount !== 1)
    : active.analysis.missingPeriods;
  const visibleQualityItems = [
    ...visibleMissingPeriods.map(item => ({
      primary: `${formatTime(item.start)} to ${formatTime(item.end)}`,
      secondary: `${item.missingCount} missing records`,
    })),
    ...active.analysis.duplicateTimestamps.map(item => ({
      primary: formatTime(item.timestamp),
      secondary: `${item.count} duplicate records`,
    })),
  ];

  return (
    <div className="panel">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="panel-title">Event Signals</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Timestamped spikes, range violations, and data-quality anomalies.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="status-chip">{activeTotal} events</span>
          <label className="nav-pill inline-flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 accent-[var(--accent)]"
              checked={hideSingleMissingRecords}
              onChange={(event) => setHideSingleMissingRecords(event.target.checked)}
            />
            Hide 1 missing record
          </label>
          <button className="nav-pill" type="button" onClick={() => setShowLists((current) => !current)}>
            {showLists ? "Collapse lists" : "Expand lists"}
          </button>
        </div>
      </div>

      <details
        className="mt-3 rounded-lg border border-border bg-surface-muted"
        open={totalsExpanded}
        onToggle={(event) => setTotalsExpanded(event.currentTarget.open)}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-semibold text-card-foreground">
          <span>Totals breakdown</span>
          <span className="text-xs text-muted-foreground">{totalsExpanded ? "Collapse" : "Expand totals"}</span>
        </summary>
        <div className="border-t border-border px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="count-chip count-chip-danger">{activeViolations} range violations</span>
            <span className="count-chip count-chip-caution">{activeSpikes} spikes</span>
            <span className="count-chip">{activeMissing} missing periods</span>
            <span className="count-chip">{activeDuplicates} duplicate timestamps</span>
          </div>
        </div>
      </details>

      <div className="mt-3 grid gap-3">
      {analyses.length > 1 && (
        <div className="inline-flex w-full flex-wrap gap-1 rounded-xl border border-border bg-accent-muted-surface p-1">
          {analyses.map(({ metric, analysis: ma }) => {
            const spikes = ma.spikes.length;
            const violations = ma.rangeViolations.length;
            const quality = ma.missingPeriods.length + ma.duplicateTimestamps.length;
            const isActive = metric === active.metric;
            const total = spikes + violations + quality;

            return (
              <button
                key={metric}
                onClick={() => setActiveMetric(metric)}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-colors
                  ${isActive
                    ? "border border-accent-border bg-surface font-medium text-heading"
                    : "border border-transparent text-muted-foreground hover:bg-surface/70 hover:text-heading"
                  }`}
                type="button"
              >
                <span>{ma.metricProfile.label}</span>
                <span className="flex items-center gap-1">
                  <span className="count-chip">{total}</span>
                  {totalsExpanded && violations > 0 && (
                    <span className="count-chip count-chip-danger">{violations} range</span>
                  )}
                  {totalsExpanded && spikes > 0 && (
                    <span className="count-chip count-chip-caution">{spikes} spike{spikes !== 1 ? "s" : ""}</span>
                  )}
                  {totalsExpanded && quality > 0 && (
                    <span className="count-chip">{quality} quality</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {!showLists ? (
        <p className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm text-muted-foreground">
          Event lists are collapsed. Expand lists to inspect all timestamps.
        </p>
      ) : (
        <div className="grid gap-2.5 lg:grid-cols-3">
          <EventList
            title="Spike events"
            empty="No spikes detected"
            tone="caution"
            items={active.analysis.spikes.map(item => ({
              primary: formatTime(item.timestamp),
              secondary: `${item.previousValue} -> ${item.currentValue} (${item.difference}) - limit ${item.limit}`,
            }))}
            maxVisible={6}
          />
          <EventList
            title="Range violations"
            empty="No range violations"
            tone="critical"
            items={active.analysis.rangeViolations.map(item => ({
              primary: formatTime(item.timestamp),
              secondary: `${item.value} is ${item.direction} range ${item.minimum}-${item.maximum}`,
            }))}
            maxVisible={6}
          />
          <EventList
            title="Data quality"
            empty="No quality issues"
            items={visibleQualityItems}
            maxVisible={6}
          />
        </div>
      )}
      </div>
    </div>
  );
}
