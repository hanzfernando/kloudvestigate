"use client";

import { useMemo, useState } from "react";
import type { IntervalSummary, TelemetryAnalysis } from "@/lib/telemetry-types";
import type { MetricInvestigationAnalysis } from "./types";
import { formatTime } from "./utils";

export function TelemetryTimeline({
  analysis,
  metricAnalyses,
  sourceLabel,
}: {
  analysis?: TelemetryAnalysis;
  metricAnalyses?: MetricInvestigationAnalysis[];
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
      <TelemetryChart analysis={analysis} metricAnalyses={metricAnalyses} />
    </div>
  );
}

function TelemetryChart({
  analysis,
  metricAnalyses,
}: {
  analysis?: TelemetryAnalysis;
  metricAnalyses?: MetricInvestigationAnalysis[];
}) {
  const [activePoint, setActivePoint] = useState<{
    interval: IntervalSummary;
    x: number;
    y: number;
    values: TooltipMetricValue[];
  } | null>(null);
  const width = 920;
  const height = 260;
  const intervals = analysis?.intervals ?? [];
  const values = intervals.map((item) => item.maximum);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const points = intervals.map((item, index) => getPoint(item, index, intervals.length, width, height, min, max));
  const polylinePoints = points.map((point) => `${point.x},${point.y}`).join(" ");
  const tooltipValuesByTimestamp = useMemo(
    () => buildTooltipValuesByTimestamp(analysis, metricAnalyses),
    [analysis, metricAnalyses],
  );

  return (
    <div className="relative overflow-visible rounded border border-[#dbe1d8] bg-white">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[260px] w-full" role="img" aria-label="Telemetry max value line chart">
        <rect width={width} height={height} fill="#ffffff" />
        {[0, 1, 2, 3].map((line) => (
          <line key={line} x1="0" x2={width} y1={line * 65} y2={line * 65} stroke="#e3e8df" />
        ))}
        <polyline fill="none" stroke="#2d6a4f" strokeWidth="3" points={polylinePoints} />
        {points.map(({ item, x, y }) => {
          const color = getIntervalColor(item);
          return (
            <g
              key={item.start}
              onMouseEnter={() => setActivePoint({
                interval: item,
                x,
                y,
                values: tooltipValuesByTimestamp.get(item.start) ?? [],
              })}
              onMouseLeave={() => setActivePoint(null)}
            >
              <circle cx={x} cy={y} r="12" fill="transparent" />
              <circle cx={x} cy={y} r="4.5" fill={color} stroke="#ffffff" strokeWidth="2" />
            </g>
          );
        })}
      </svg>
      {activePoint ? <TimelineTooltip activePoint={activePoint} width={width} height={height} /> : null}
    </div>
  );
}

interface TooltipMetricValue {
  label: string;
  unit: string;
  maximum: number;
  average: number;
}

function TimelineTooltip({
  activePoint,
  width,
  height,
}: {
  activePoint: {
    interval: IntervalSummary;
    x: number;
    y: number;
    values: TooltipMetricValue[];
  };
  width: number;
  height: number;
}) {
  const left = (activePoint.x / width) * 100;
  const top = (activePoint.y / height) * 100;
  const alignRight = left > 68;

  return (
    <div
      className="pointer-events-none absolute z-20 min-w-58 max-w-80 rounded-[6px] border border-[#cfd7cc] bg-[#fbfcfa] p-3 text-xs shadow-lg"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        transform: alignRight ? "translate(-100%, calc(-100% - 12px))" : "translate(12px, calc(-100% - 12px))",
      }}
    >
      <p className="font-semibold text-[#26372d]">
        {formatTime(activePoint.interval.start)}
      </p>
      <p className="mt-1 text-[#6b786f]">
        to {formatTime(activePoint.interval.end)}
      </p>
      <div className="mt-3 grid gap-2">
        {activePoint.values.length ? activePoint.values.map((item) => (
          <div className="flex items-center justify-between gap-4" key={item.label}>
            <span className="text-[#4d5d53]">{item.label}</span>
            <span className="font-mono font-semibold text-[#18211d]">
              {formatMetricValue(item.maximum)} {item.unit}
            </span>
          </div>
        )) : (
          <div className="flex items-center justify-between gap-4">
            <span className="text-[#4d5d53]">Maximum</span>
            <span className="font-mono font-semibold text-[#18211d]">
              {formatMetricValue(activePoint.interval.maximum)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function getPoint(
  item: IntervalSummary,
  index: number,
  count: number,
  width: number,
  height: number,
  min: number,
  max: number,
) {
  const x = count <= 1 ? 0 : (index / (count - 1)) * width;
  const y = height - ((item.maximum - min) / Math.max(0.1, max - min)) * (height - 24) - 12;
  return { item, x, y };
}

function buildTooltipValuesByTimestamp(
  analysis?: TelemetryAnalysis,
  metricAnalyses?: MetricInvestigationAnalysis[],
) {
  const values = new Map<string, TooltipMetricValue[]>();
  const analyses = metricAnalyses?.length
    ? metricAnalyses.map((item) => item.analysis)
    : analysis
      ? [analysis]
      : [];

  for (const item of analyses) {
    const profile = item.metricProfile;
    for (const interval of item.intervals) {
      const row = values.get(interval.start) ?? [];
      row.push({
        label: profile.label,
        unit: profile.unit,
        maximum: interval.maximum,
        average: interval.average,
      });
      values.set(interval.start, row);
    }
  }

  return values;
}

function formatMetricValue(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function getIntervalColor(item: IntervalSummary) {
  if (item.dominantWarningLevel === "Critical" || item.dominantWarningLevel === "Warning") return "#b9472b";
  if (item.missingCount) return "#b7791f";
  return "#2d6a4f";
}
