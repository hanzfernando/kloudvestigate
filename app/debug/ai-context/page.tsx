"use client";

import { PageShell } from "@/components/layout/PageShell";

export default function AiContextDebugPage() {
  return (
    <PageShell
      eyebrow="Developer diagnostics"
      title="AI Request Context Viewer"
    >
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
    </PageShell>
  );
}
