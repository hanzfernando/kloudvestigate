"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface DebugPayload {
  context: unknown;
  prompt: string;
  answer: string;
}

export default function AiContextDebugPage() {
  const [payload, setPayload] = useState<DebugPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/investigations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stationId: "station-001",
          metric: "calculatedWaterLevel",
          start: "2026-05-20T00:00:00.000Z",
          end: "2026-05-20T16:00:00.000Z",
          aggregationMinutes: 60,
          question: "What timestamps did the data spike and did it cross warning levels?",
          useDemoData: true,
        }),
      });
      setPayload((await response.json()) as DebugPayload);
      setLoading(false);
    }

    void load();
  }, []);

  return (
    <main className="min-h-screen bg-[#f4f6f3] px-5 py-6 text-[#18211d]">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#537062]">Developer diagnostics</p>
            <h1 className="mt-2 text-3xl font-semibold">AI Request Context Viewer</h1>
          </div>
          <Link className="nav-pill" href="/">Back to dashboard</Link>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section className="panel">
            <h2 className="panel-title">Structured Telemetry Payload</h2>
            <p className="mt-2 text-sm text-[#5f6b63]">
              This is the compressed JSON context sent to the AI layer after deterministic preprocessing.
            </p>
            <pre className="mt-4 max-h-[720px] overflow-auto rounded border border-[#dbe1d8] bg-white p-4 text-xs leading-5">
              {loading ? "Loading context..." : JSON.stringify(payload?.context, null, 2)}
            </pre>
          </section>

          <section className="grid gap-4">
            <div className="panel">
              <h2 className="panel-title">Generated Prompt</h2>
              <pre className="mt-4 max-h-[420px] overflow-auto whitespace-pre-wrap rounded border border-[#dbe1d8] bg-white p-4 text-xs leading-5">
                {loading ? "Loading prompt..." : payload?.prompt}
              </pre>
            </div>
            <div className="panel">
              <h2 className="panel-title">Copilot Response</h2>
              <div className="mt-4 rounded border border-[#dbe1d8] bg-white p-4 text-sm leading-6">
                {loading ? "Loading answer..." : payload?.answer}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
