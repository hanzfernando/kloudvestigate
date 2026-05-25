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
import { phtDayBoundaryToUtcISOString, philippineInputToUtcISOString, toInputValue } from "./telemetry/utils";
import { useInvestigationQuickActionStore } from "./telemetry/useInvestigationQuickActionStore";

const QUICK_ACTION_REQUEST_GAP_MS = 350;
const QUICK_ACTION_REQUEST_TIMEOUT_MS = 45_000;

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
  const [manualDataStationId, setManualDataStationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const quickActionStatus = useInvestigationQuickActionStore((state) => state.status);
  const quickActionCompletedStations = useInvestigationQuickActionStore((state) => state.completedStations);
  const quickActionTotalStations = useInvestigationQuickActionStore((state) => state.totalStations);
  const quickActionResultsByStationId = useInvestigationQuickActionStore((state) => state.resultsByStationId);
  const quickActionError = useInvestigationQuickActionStore((state) => state.error);
  const beginQuickAction = useInvestigationQuickActionStore((state) => state.start);
  const setQuickActionStation = useInvestigationQuickActionStore((state) => state.setActiveStation);
  const setQuickActionResult = useInvestigationQuickActionStore((state) => state.setStationResult);
  const completeQuickAction = useInvestigationQuickActionStore((state) => state.complete);
  const resetQuickAction = useInvestigationQuickActionStore((state) => state.reset);

  const quickActionRunning = quickActionStatus === "running";
  const quickActionData = quickActionStatus !== "idle" ? quickActionResultsByStationId[stationId] ?? null : null;
  const displayedData = quickActionData ?? (manualDataStationId === stationId ? data : null);
  const sourceLabel =
    displayedData?.source === "kloudtrack" || stationSource === "kloudtrack"
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
    if (quickActionRunning) return;

    resetQuickAction();
    setLoading(true);
    setError(null);
    setData(null);
    setManualDataStationId(selectedStationId);

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

  async function runInvestigateEveryStation() {
    if (quickActionRunning || loading || !stations.length) return;

    const populatedResults = quickActionResultsByStationId;
    const hasPopulatedResults = Object.keys(populatedResults).length > 0;
    const skipPopulatedStations = hasPopulatedResults
      ? window.confirm("There is already populated investigation data. Skip stations that already have data?")
      : false;
    const initialResults = skipPopulatedStations ? populatedResults : {};

    setError(null);
    if (!skipPopulatedStations) resetQuickAction();
    setManualDataStationId(null);
    setData(null);
    beginQuickAction(stations.length, initialResults);

    const { start, end } = buildYesterdayFullDayRange();

    for (const [index, station] of stations.entries()) {
      setQuickActionStation(station.id, index);
      setStationId(station.id);

      const existingResult = initialResults[station.id];
      if (existingResult) {
        setData(existingResult);
        setQuickActionStation(station.id, index + 1);
        continue;
      }

      try {
        const response = await fetchWithTimeout(
          "/api/investigations",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              stationId: station.id,
              metric: "all",
              aggregationMinutes: 1,
              start,
              end,
              question: "Summarize every metric for yesterday's full day.",
              askCopilot: false,
              useDemoData: false,
            }),
          },
          QUICK_ACTION_REQUEST_TIMEOUT_MS,
        );

        if (!response.ok) {
          throw new Error(`Investigation request failed (${response.status})`);
        }

        const payload = (await response.json()) as InvestigationResponse;
        setQuickActionResult(station.id, payload);
        setQuickActionStation(station.id, index + 1);
        setData(payload);
      } catch {
        setQuickActionStation(station.id, index + 1);
      }

      if (index < stations.length - 1) {
        await wait(QUICK_ACTION_REQUEST_GAP_MS);
      }
    }

    completeQuickAction();
  }

  return (
    <div className="min-h-screen bg-[#f4f6f3] text-[#18211d]">
      <header className="border-b border-[#d8ded5] bg-[#fbfcfa]">
        <div className="mx-auto flex max-w-375 flex-col gap-5 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
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
            <button className="primary-action" onClick={() => void runInvestigation()} disabled={loading || quickActionRunning}>
              {loading ? "Analyzing" : "Run investigation"}
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto grid max-w-375 gap-4 px-5 py-5 xl:grid-cols-[320px_minmax(0,1fr)_420px]">
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
          onQuickInvestigateEveryStation={() => void runInvestigateEveryStation()}
          quickActionBusy={quickActionRunning}
          quickActionProgress={`${quickActionCompletedStations}/${quickActionTotalStations}`}
          quickActionResultsByStationId={quickActionStatus !== "idle" ? quickActionResultsByStationId : undefined}
        />

        <section className="grid gap-4">
          {error ? <div className="panel border-[#c76f59] text-[#843722]">{error}</div> : null}
          {quickActionError ? <div className="panel border-[#c76f59] text-[#843722]">{quickActionError}</div> : null}
          <SummaryStats
            analysis={displayedData?.analysis}
            metricAnalyses={displayedData?.metricAnalyses}
          />
          <OutlierOverview analysis={displayedData?.analysis} metricAnalyses={displayedData?.metricAnalyses} />
          <TelemetryTimeline
            analysis={displayedData?.analysis}
            metricAnalyses={displayedData?.metricAnalyses}
            sourceLabel={sourceLabel}
          />
          <EventsPanel analysis={displayedData?.analysis} metricAnalyses={displayedData?.metricAnalyses} />
          <FetchedValuesTable
            analysis={displayedData?.analysis}
            records={displayedData?.records ?? []}
            metricAnalyses={displayedData?.metricAnalyses}
          />
        </section>

        <CopilotPanel
          question={question}
          metric={metric}
          data={displayedData}
          loading={loading}
          onQuestionChange={setQuestion}
          onRun={() => void runInvestigation({ askCopilot: true })}
        />
      </main>
    </div>
  );
}

function buildYesterdayFullDayRange() {
  return {
    start: phtDayBoundaryToUtcISOString(-1),
    end: phtDayBoundaryToUtcISOString(0),
  };
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}
