"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type {
  IntervalSummary,
  InvestigationContext,
  MetricKey,
  PointMatch,
  StationMetadata,
  TelemetryAnalysis,
} from "@/lib/telemetry-types";

interface InvestigationResponse {
  station: StationMetadata;
  analysis: TelemetryAnalysis;
  context: InvestigationContext;
  prompt: string;
  pointMatch: PointMatch | null;
  answer: string;
  source: "demo" | "kloudtrack";
  aiProvider?: "gemini" | "deterministic";
  aiError?: string;
}

interface StationsResponse {
  stations: StationMetadata[];
  source: "demo" | "kloudtrack";
  reason?: string;
}

const metrics: Array<{ label: string; value: MetricKey }> = [
  { label: "Rainfall", value: "rainfall" },
  { label: "Temperature", value: "temperature" },
  { label: "Heat Index", value: "heatIndex" },
  { label: "Humidity", value: "humidity" },
  { label: "Pressure", value: "pressure" },
  { label: "Wind speed", value: "windSpeed" },
  { label: "Light", value: "lightIntensity" },
];

const questions = [
  "Summarize the trend from the selected range.",
  "What timestamps did the data spike?",
  "Did the station cross warning thresholds?",
  "Were there missing telemetry records?",
  "Which hour had the highest reading?",
];

export function TelemetryInvestigationDashboard() {
  const now = useMemo(() => new Date("2026-05-20T16:00:00.000Z"), []);
  const [stationId, setStationId] = useState("station-001");
  const [stations, setStations] = useState<StationMetadata[]>([]);
  const [stationSource, setStationSource] = useState<"demo" | "kloudtrack">("demo");
  const [metric, setMetric] = useState<MetricKey>("calculatedWaterLevel");
  const [aggregationMinutes, setAggregationMinutes] = useState(60);
  const [start, setStart] = useState(toInputValue(new Date(now.getTime() - 12 * 60 * 60_000)));
  const [end, setEnd] = useState(toInputValue(now));
  const [question, setQuestion] = useState(questions[0]);
  const [data, setData] = useState<InvestigationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStations() {
      try {
        const response = await fetch("/api/stations", { cache: "no-store" });
        if (!response.ok) throw new Error(`Station list request failed (${response.status})`);
        const payload = (await response.json()) as StationsResponse;
        setStations(payload.stations);
        setStationSource(payload.source);
        const firstStationId = payload.stations[0]?.id ?? stationId;
        if (firstStationId !== stationId) setStationId(firstStationId);
        void runInvestigation(question, firstStationId);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Unknown station list error");
        void runInvestigation(question, stationId);
      }
    }

    void loadStations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runInvestigation(nextQuestion = question, selectedStationId = stationId) {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/investigations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stationId: selectedStationId,
          metric,
          aggregationMinutes,
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          question: nextQuestion,
          useDemoData: false,
        }),
      });

      if (!response.ok) throw new Error(`Investigation request failed (${response.status})`);
      setData((await response.json()) as InvestigationResponse);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unknown request error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f6f3] text-[#18211d]">
      <header className="border-b border-[#d8ded5] bg-[#fbfcfa]">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-5 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#537062]">
              Internal telemetry intelligence
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-normal sm:text-3xl">
              Telemetry Investigation Copilot
            </h1>
          </div>
          <nav className="flex flex-wrap gap-2 text-sm">
            <Link className="nav-pill" href="/architecture">Architecture</Link>
            <Link className="nav-pill" href="/debug/ai-context">AI context viewer</Link>
            <button className="primary-action" onClick={() => runInvestigation()} disabled={loading}>
              {loading ? "Analyzing" : "Run investigation"}
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1500px] gap-4 px-5 py-5 xl:grid-cols-[320px_minmax(0,1fr)_420px]">
        <aside className="panel h-fit">
          <h2 className="panel-title">Investigation Scope</h2>
          <label className="field-label">
            Station
            <select className="field" value={stationId} onChange={(event) => setStationId(event.target.value)}>
              {stations.length ? stations.map((station) => (
                <option key={station.id} value={station.id}>
                  {station.name}
                </option>
              )) : (
                <option value={stationId}>Loading stations</option>
              )}
            </select>
          </label>
          <label className="field-label">
            Metric
            <select className="field" value={metric} onChange={(event) => setMetric(event.target.value as MetricKey)}>
              {metrics.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label className="field-label">
            Start
            <input className="field" type="datetime-local" value={start} onChange={(event) => setStart(event.target.value)} />
          </label>
          <label className="field-label">
            End
            <input className="field" type="datetime-local" value={end} onChange={(event) => setEnd(event.target.value)} />
          </label>
          <label className="field-label">
            Aggregation
            <select className="field" value={aggregationMinutes} onChange={(event) => setAggregationMinutes(Number(event.target.value))}>
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
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#69766d]">Quick questions</p>
            <div className="mt-3 grid gap-2">
              {questions.map((item) => (
                <button
                  className="question-button"
                  key={item}
                  onClick={() => {
                    setQuestion(item);
                    void runInvestigation(item);
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="grid gap-4">
          {error ? <div className="panel border-[#c76f59] text-[#843722]">{error}</div> : null}
          <div className="grid gap-3 md:grid-cols-4">
            <Stat label="Average" value={data?.analysis.summary.average ?? 0} />
            <Stat label="Maximum" value={data?.analysis.summary.maximum ?? 0} />
            <Stat label="Missing" value={data?.analysis.summary.missingRecordCount ?? 0} />
            <Stat label="Warnings" value={data?.analysis.thresholdCrossings.length ?? 0} />
          </div>

          <div className="panel">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="panel-title">Telemetry Timeline</h2>
                <p className="text-sm text-[#5f6b63]">
                  Aggregated summaries with deterministic spike, warning, and missing-data markers.
                </p>
              </div>
              <span className="status-chip">
                {data?.source === "kloudtrack" || stationSource === "kloudtrack"
                  ? "KloudTrack API"
                  : "Demo fallback"}
              </span>
            </div>
            <TelemetryChart intervals={data?.analysis.intervals ?? []} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <EventList
              title="Spike Events"
              empty="No spikes detected"
              items={(data?.analysis.spikes ?? []).slice(0, 6).map((item) => ({
                primary: formatTime(item.timestamp),
                secondary: `${item.previousValue} to ${item.currentValue} (${item.difference})`,
              }))}
            />
            <EventList
              title="Data Quality"
              empty="No missing periods or duplicates"
              items={[
                ...(data?.analysis.missingPeriods ?? []).slice(0, 4).map((item) => ({
                  primary: `${formatTime(item.start)} to ${formatTime(item.end)}`,
                  secondary: `${item.missingCount} missing minute records`,
                })),
                ...(data?.analysis.duplicateTimestamps ?? []).slice(0, 2).map((item) => ({
                  primary: formatTime(item.timestamp),
                  secondary: `${item.count} duplicate records`,
                })),
              ]}
            />
          </div>

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
                  {(data?.analysis.intervals ?? []).slice(0, 12).map((item) => (
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
        </section>

        <aside className="panel h-fit xl:sticky xl:top-4">
          <h2 className="panel-title">Copilot Answer</h2>
          <textarea
            className="field mt-3 min-h-24"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
          />
          <button className="primary-action mt-3 w-full" onClick={() => runInvestigation()} disabled={loading}>
            Ask copilot
          </button>
          <div className="mt-4 rounded border border-[#dbe1d8] bg-[#f7f8f5] p-4 text-sm leading-6 text-[#24312a]">
            {data?.answer ?? "Run an investigation to generate an operational answer."}
          </div>
          {data?.aiError ? (
            <div className="mt-3 rounded border border-[#d7b98a] bg-[#fff8e8] p-3 text-xs leading-5 text-[#6c4b16]">
              Gemini fallback: {data.aiError}
            </div>
          ) : null}
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <Meta label="Station" value={data?.station.name ?? "n/a"} />
            <Meta label="Metric" value={metric} />
            <Meta label="Latest" value={formatTime(data?.analysis.summary.latestTimestamp)} />
            <Meta label="AI" value={data?.aiProvider ?? "deterministic"} />
          </div>
        </aside>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="panel">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#69766d]">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-[#dbe1d8] bg-white p-3">
      <p className="text-[#69766d]">{label}</p>
      <p className="mt-1 break-words font-mono text-[#1f2a24]">{value}</p>
    </div>
  );
}

function EventList({ title, empty, items }: { title: string; empty: string; items: Array<{ primary: string; secondary: string }> }) {
  return (
    <div className="panel">
      <h2 className="panel-title">{title}</h2>
      <div className="mt-3 grid gap-2">
        {items.length ? items.map((item) => (
          <div className="rounded border border-[#dbe1d8] bg-white p-3" key={`${item.primary}-${item.secondary}`}>
            <p className="font-mono text-sm">{item.primary}</p>
            <p className="mt-1 text-sm text-[#5f6b63]">{item.secondary}</p>
          </div>
        )) : <p className="text-sm text-[#5f6b63]">{empty}</p>}
      </div>
    </div>
  );
}

function TelemetryChart({ intervals }: { intervals: IntervalSummary[] }) {
  const width = 920;
  const height = 260;
  const values = intervals.map((item) => item.maximum);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const points = intervals.map((item, index) => {
    const x = intervals.length <= 1 ? 0 : (index / (intervals.length - 1)) * width;
    const y = height - ((item.maximum - min) / Math.max(0.1, max - min)) * (height - 24) - 12;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="overflow-hidden rounded border border-[#dbe1d8] bg-white">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[260px] w-full" role="img" aria-label="Telemetry max value line chart">
        <rect width={width} height={height} fill="#ffffff" />
        {[0, 1, 2, 3].map((line) => (
          <line key={line} x1="0" x2={width} y1={line * 65} y2={line * 65} stroke="#e3e8df" />
        ))}
        <polyline fill="none" stroke="#2d6a4f" strokeWidth="3" points={points} />
        {intervals.map((item, index) => {
          const x = intervals.length <= 1 ? 0 : (index / (intervals.length - 1)) * width;
          const y = height - ((item.maximum - min) / Math.max(0.1, max - min)) * (height - 24) - 12;
          const color = item.dominantWarningLevel === "Critical" || item.dominantWarningLevel === "Warning" ? "#b9472b" : item.missingCount ? "#b7791f" : "#2d6a4f";
          return <circle key={item.start} cx={x} cy={y} r="4" fill={color} />;
        })}
      </svg>
    </div>
  );
}

function toInputValue(date: Date) {
  return date.toISOString().slice(0, 16);
}

function formatTime(value?: string | null) {
  if (!value) return "n/a";
  return new Date(value).toISOString().slice(0, 16).replace("T", " ");
}
