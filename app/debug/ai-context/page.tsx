"use client";

import Link from "next/link";

export default function AiContextDebugPage() {
  return (
    <main className="min-h-screen bg-[#f4f6f3] px-5 py-6 text-[#18211d]">
      <div className="mx-auto max-w-350">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#537062]">Developer diagnostics</p>
            <h1 className="mt-2 text-3xl font-semibold">AI Request Context Viewer</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="nav-pill" href="/config">Metric config</Link>
            <Link className="nav-pill" href="/">Back to dashboard</Link>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section className="panel">
            <h2 className="panel-title">Structured Telemetry Payload</h2>
            <p className="mt-2 text-sm text-[#5f6b63]">
              This is the compressed JSON context sent to the AI layer after deterministic preprocessing.
            </p>
            <pre className="mt-4 max-h-180 overflow-auto rounded border border-[#dbe1d8] bg-white p-4 text-xs leading-5">
              Run an investigation from the dashboard, then inspect the API response or extend this page with a selected investigation ID.
            </pre>
          </section>

          <section className="grid gap-4">
            <div className="panel">
              <h2 className="panel-title">Generated Prompt</h2>
              <pre className="mt-4 max-h-105 overflow-auto whitespace-pre-wrap rounded border border-[#dbe1d8] bg-white p-4 text-xs leading-5">
                Manual-only mode is enabled. This page no longer triggers an investigation on load.
              </pre>
            </div>
            <div className="panel">
              <h2 className="panel-title">Copilot Response</h2>
              <div className="mt-4 rounded border border-[#dbe1d8] bg-white p-4 text-sm leading-6">
                Choose station, metric, range, and question on the dashboard, then click Run investigation.
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
