"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { MetricKey, StationMetadata } from "@/lib/telemetry-types";
import { CopilotPanel } from "./telemetry/CopilotPanel";
import { EventsPanel } from "./telemetry/EventsPanel";
import { FetchedValuesTable } from "./telemetry/FetchedValuesTable";
import { InvestigationScopePanel } from "./telemetry/InvestigationScopePanel";
import { IntervalSummaryTable } from "./telemetry/IntervalSummaryTable";
import { OutlierOverview } from "./telemetry/OutlierOverview";
import { SummaryStats } from "./telemetry/SummaryStats";
import { TelemetryTimeline } from "./telemetry/TelemetryTimeline";
import { metrics, questions } from "./telemetry/constants";
import type { InvestigationResponse, SortDirection, SortKey, StationsResponse } from "./telemetry/types";
import { getOutlierSets, sortRecords, toInputValue } from "./telemetry/utils";

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
  const [sortKey, setSortKey] = useState<SortKey>("timestamp");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const sortedRecords = useMemo(
    () => sortRecords(data?.records ?? [], sortKey, sortDirection),
    [data?.records, sortDirection, sortKey],
  );
  const outlierSets = useMemo(
    () => getOutlierSets(data?.analysis),
    [data?.analysis],
  );
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

  function setSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection("asc");
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
        <InvestigationScopePanel
          stations={stations}
          stationId={stationId}
          metric={metric}
          metrics={metrics}
          start={start}
          end={end}
          aggregationMinutes={aggregationMinutes}
          question={question}
          onStationChange={setStationId}
          onMetricChange={setMetric}
          onStartChange={setStart}
          onEndChange={setEnd}
          onAggregationChange={setAggregationMinutes}
          onQuestionChange={setQuestion}
          onRunQuestion={(nextQuestion) => void runInvestigation(nextQuestion)}
        />

        <section className="grid gap-4">
          {error ? <div className="panel border-[#c76f59] text-[#843722]">{error}</div> : null}
          <SummaryStats analysis={data?.analysis} />
          <OutlierOverview analysis={data?.analysis} />
          <TelemetryTimeline analysis={data?.analysis} sourceLabel={sourceLabel} />
          <EventsPanel analysis={data?.analysis} />
          <IntervalSummaryTable analysis={data?.analysis} />
          <FetchedValuesTable
            records={sortedRecords}
            sortKey={sortKey}
            sortDirection={sortDirection}
            rangeTimestamps={outlierSets.rangeTimestamps}
            spikeTimestamps={outlierSets.spikeTimestamps}
            onSort={setSort}
          />
        </section>

        <CopilotPanel
          question={question}
          metric={metric}
          data={data}
          loading={loading}
          onQuestionChange={setQuestion}
          onRun={() => void runInvestigation()}
        />
      </main>
    </div>
  );
}
