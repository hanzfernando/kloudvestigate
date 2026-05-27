"use client";

import { useMemo, useState } from "react";
import { getMetricAnalysisProfile } from "@/lib/metric-profiles";
import type { MetricRange, MetricRangeOverrides } from "@/lib/metric-range-config";
import type { MetricKey } from "@/lib/telemetry-types";

type MetricRangeRow = {
  metric: MetricKey;
  label: string;
  unit: string;
  defaultRange: MetricRange;
};

type DraftState = Record<MetricKey, { minimum: string; maximum: string }>;

export function MetricRangeConfigPanel({
  metrics,
  initialOverrides,
}: {
  metrics: MetricRangeRow[];
  initialOverrides: MetricRangeOverrides;
}) {
  const [draft, setDraft] = useState<DraftState>(() => buildDraftState(metrics, initialOverrides));
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const changedCount = useMemo(() => countOverrides(metrics, draft), [draft, metrics]);

  async function saveOverrides() {
    setSaving(true);
    setStatus(null);

    try {
      const overrides = buildOverridesFromDraft(metrics, draft);
      const response = await fetch("/api/metric-range-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overrides }),
      });

      if (!response.ok) {
        throw new Error(`Save failed (${response.status})`);
      }

      const payload = (await response.json()) as { overrides: MetricRangeOverrides };
      setDraft(buildDraftState(metrics, payload.overrides));
      setStatus(`Saved ${Object.keys(payload.overrides).length} override(s).`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unknown save error");
    } finally {
      setSaving(false);
    }
  }

  function resetMetric(metric: MetricKey) {
    const profile = getMetricAnalysisProfile(metric);
    setDraft((current) => ({
      ...current,
      [metric]: {
        minimum: String(profile.acceptableRange.minimum),
        maximum: String(profile.acceptableRange.maximum),
      },
    }));
  }

  function resetAll() {
    setDraft(buildDraftState(metrics, {}));
  }

  return (
    <div className="panel">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="panel-title">Acceptable Range Overrides</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Start from the metric profile defaults, then override only the metrics that need a different acceptable range.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="status-chip">{changedCount} edited</span>
          <button className="nav-pill" type="button" onClick={resetAll}>
            Reset all
          </button>
          <button className="primary-action" type="button" disabled={saving} onClick={() => void saveOverrides()}>
            {saving ? "Saving..." : "Save overrides"}
          </button>
        </div>
      </div>

      {status ? <p className="mt-3 text-sm text-muted-foreground">{status}</p> : null}

      <div className="mt-4 grid gap-3">
        {metrics.map((metric) => {
          const draftRow = draft[metric.metric];
          const isCustom = draftRow.minimum !== String(metric.defaultRange.minimum) || draftRow.maximum !== String(metric.defaultRange.maximum);

          return (
            <div className={`rounded border p-4 ${isCustom ? "border-accent-border bg-accent-surface" : "border-border-subtle bg-surface"}`} key={metric.metric}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-heading">{metric.label}</h3>
                    <span className="status-chip">{metric.metric}</span>
                    <span className="status-chip">{metric.unit}</span>
                    {isCustom ? <span className="status-chip">custom</span> : <span className="status-chip">default</span>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Default range: {metric.defaultRange.minimum} to {metric.defaultRange.maximum} {metric.unit}
                  </p>
                </div>
                <button className="nav-pill w-fit" type="button" onClick={() => resetMetric(metric.metric)}>
                  Reset metric
                </button>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="field-label">
                  Minimum
                  <input
                    className="field"
                    inputMode="decimal"
                    type="number"
                    value={draftRow.minimum}
                    onChange={(event) => setDraft((current) => ({
                      ...current,
                      [metric.metric]: { ...current[metric.metric], minimum: event.target.value },
                    }))}
                  />
                </label>
                <label className="field-label">
                  Maximum
                  <input
                    className="field"
                    inputMode="decimal"
                    type="number"
                    value={draftRow.maximum}
                    onChange={(event) => setDraft((current) => ({
                      ...current,
                      [metric.metric]: { ...current[metric.metric], maximum: event.target.value },
                    }))}
                  />
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function buildDraftState(metrics: MetricRangeRow[], overrides: MetricRangeOverrides): DraftState {
  return Object.fromEntries(
    metrics.map((metric) => {
      const range = overrides[metric.metric] ?? metric.defaultRange;
      return [metric.metric, { minimum: String(range.minimum), maximum: String(range.maximum) }];
    }),
  ) as DraftState;
}

function buildOverridesFromDraft(metrics: MetricRangeRow[], draft: DraftState): MetricRangeOverrides {
  const overrides: MetricRangeOverrides = {};

  for (const metric of metrics) {
    const minimumRaw = draft[metric.metric].minimum.trim();
    const maximumRaw = draft[metric.metric].maximum.trim();
    const minimum = Number(minimumRaw);
    const maximum = Number(maximumRaw);

    if (!minimumRaw || !maximumRaw) {
      throw new Error(`${metric.label} needs both a minimum and maximum value.`);
    }

    if (!Number.isFinite(minimum) || !Number.isFinite(maximum)) {
      throw new Error(`${metric.label} needs numeric minimum and maximum values.`);
    }

    if (minimum > maximum) {
      throw new Error(`${metric.label} minimum cannot be greater than maximum.`);
    }

    if (minimum !== metric.defaultRange.minimum || maximum !== metric.defaultRange.maximum) {
      overrides[metric.metric] = { minimum, maximum };
    }
  }

  return overrides;
}

function countOverrides(metrics: MetricRangeRow[], draft: DraftState) {
  return metrics.reduce((count, metric) => {
    const row = draft[metric.metric];
    return row.minimum !== String(metric.defaultRange.minimum) || row.maximum !== String(metric.defaultRange.maximum)
      ? count + 1
      : count;
  }, 0);
}