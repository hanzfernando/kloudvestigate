"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { InvestigationMetricKey, StationMetadata } from "@/lib/telemetry-types";
import { CopilotPanel } from "./telemetry/CopilotPanel";
import { EventsPanel } from "./telemetry/EventsPanel";
import { FetchedValuesTable } from "./telemetry/FetchedValuesTable";
import { InvestigationScopePanel } from "./telemetry/InvestigationScopePanel";
import { OutlierOverview } from "./telemetry/OutlierOverview";
import { SummaryStats } from "./telemetry/SummaryStats";
import { TelemetryTimeline } from "./telemetry/TelemetryTimeline";
import { metrics, questions } from "./telemetry/constants";
import type { InvestigationResponse, StationsResponse } from "./telemetry/types";
import { philippineInputToUtcISOString, toInputValue } from "./telemetry/utils";

export function TelemetryInvestigationDashboard() {
  const [stationId, setStationId] = useState("station-001");
  const [stations, setStations] = useState<StationMetadata[]>([]);
  const [stationSource, setStationSource] = useState<"demo" | "kloudtrack">("demo");
  const [metric, setMetric] = useState<InvestigationMetricKey>("all");
  const [aggregationMinutes, setAggregationMinutes] = useState(60);
  const [start, setStart] = useState(() => {
    const date = new Date();

    date.setDate(date.getDate() - 1);
    date.setHours(0, 0, 0, 0);

    return toInputValue(date);
  });

  const [end, setEnd] = useState(() => {
    const date = new Date();

    date.setHours(12, 0, 0, 0);

    return toInputValue(date);
  });
  const [question, setQuestion] = useState(questions[0]);
  const [data, setData] = useState<InvestigationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sourceLabel =
    data?.source === "kloudtrack" || stationSource === "kloudtrack"
      ? "KloudTrack API"
      : "Demo fallback";

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
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Unknown station list error");
      }
    }

    void loadStations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runInvestigation({
    askCopilot = false,
    nextQuestion = question,
    selectedStationId = stationId,
  }: {
    askCopilot?: boolean;
    nextQuestion?: string;
    selectedStationId?: string;
  } = {}) {
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
          start: philippineInputToUtcISOString(start),
          end: philippineInputToUtcISOString(end),
          question: nextQuestion,
          askCopilot,
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
            <Link className="nav-pill" href="/pubmat">Pubmat table</Link>
            <Link className="nav-pill" href="/architecture">Architecture</Link>
            <Link className="nav-pill" href="/debug/ai-context">AI context viewer</Link>
            <button className="primary-action" onClick={() => runInvestigation()} disabled={loading}>
              {loading ? "Analyzing" : "Run investigation"}
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1500px] gap-4 px-5 py-5 xl:grid-cols-[320px_minmax(0,1fr)_420px]">
        <InvestigationScopePanel
          stations={stations}
          stationId={stationId}
          metric={metric}
          metrics={metrics}
          start={start}
          end={end}
          aggregationMinutes={aggregationMinutes}
          onStationChange={setStationId}
          onMetricChange={setMetric}
          onStartChange={setStart}
          onEndChange={setEnd}
          onAggregationChange={setAggregationMinutes}
        />

        <section className="grid gap-4">
          {error ? <div className="panel border-[#c76f59] text-[#843722]">{error}</div> : null}
          <SummaryStats analysis={data?.analysis} />
          <OutlierOverview analysis={data?.analysis} metricAnalyses={data?.metricAnalyses} />
          <TelemetryTimeline
            analysis={data?.analysis}
            metricAnalyses={data?.metricAnalyses}
            sourceLabel={sourceLabel}
          />
          <EventsPanel analysis={data?.analysis} metricAnalyses={data?.metricAnalyses} />
          <FetchedValuesTable
            analysis={data?.analysis}
            records={data?.records ?? []}
            metricAnalyses={data?.metricAnalyses}
          />
        </section>

        <CopilotPanel
          question={question}
          metric={metric}
          data={data}
          loading={loading}
          onQuestionChange={setQuestion}
          onRun={() => void runInvestigation({ askCopilot: true })}
        />
      </main>
    </div>
  );
}
