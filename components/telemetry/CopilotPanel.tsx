import { MessageCircle, Sparkles, X } from "lucide-react";
import { useState } from "react";
import type { InvestigationMetricKey } from "@/lib/telemetry-types";
import { MarkdownRenderer } from "./MarkdownRenderer";
import type { InvestigationResponse } from "./types";

export function CopilotPanel({
  question,
  metric,
  data,
  loading,
  onQuestionChange,
  onRun,
}: {
  question: string;
  metric: InvestigationMetricKey;
  data: InvestigationResponse | null;
  loading: boolean;
  onQuestionChange: (value: string) => void;
  onRun: () => void;
}) {
  const [open, setOpen] = useState(false);
  const metricLabel = data?.analysis.metricProfile.label ?? metric;
  const providerLabel = data?.aiProvider === "gemini" ? "Gemini" : "Deterministic";
  const hasAnswer = Boolean(data?.answer);
  const launcherLabel = hasAnswer ? "Open copilot response" : "Ask copilot";

  return (
    <div className="fixed right-4 bottom-4 z-40 flex max-w-[calc(100vw-32px)] flex-col items-end gap-3 sm:right-5 sm:bottom-5">
      {open ? (
        <aside
          id="telemetry-copilot-panel"
          className="panel max-h-[min(720px,calc(100vh-104px))] w-[min(420px,calc(100vw-32px))] overflow-auto shadow-xl"
          aria-label="Telemetry copilot"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#31563f]" aria-hidden="true" />
                <h2 className="panel-title">Copilot</h2>
              </div>
              <p className="mt-1 text-sm text-[#5f6b63]">{metricLabel}</p>
            </div>
            <div className="flex items-center gap-2">
              {data?.aiProvider ? <span className="status-chip">{providerLabel}</span> : null}
              <button
                className="icon-button"
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close copilot"
                title="Close copilot"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <label className="field-label">
            Question
            <textarea
              className="field min-h-[112px] resize-y"
              value={question}
              onChange={(event) => onQuestionChange(event.target.value)}
            />
          </label>

          <button className="primary-action mt-3 w-full" type="button" onClick={onRun} disabled={loading}>
            {loading ? "Analyzing" : "Ask copilot"}
          </button>

          {data?.aiError ? (
            <p className="mt-3 rounded-md border border-[#e1b0a2] bg-[#fff1ed] p-3 text-sm text-[#92351f]">
              {data.aiError}
            </p>
          ) : null}

          {data?.aiWarning ? (
            <p className="mt-3 rounded-md border border-[#dfc58d] bg-[#fff8e8] p-3 text-sm text-[#755010]">
              {data.aiWarning}
            </p>
          ) : null}

          <div className="mt-4 border-t border-[#dbe1d8] pt-4 text-sm leading-6 text-[#26372d]">
            {data?.answer ? (
              <MarkdownRenderer text={data.answer} />
            ) : data ? (
              <p className="text-[#68766d]">Investigation loaded. Click Ask copilot to generate an answer.</p>
            ) : (
              <p className="text-[#68766d]">Run an investigation to load telemetry, then ask copilot manually.</p>
            )}
          </div>

          {data ? (
            <div className="mt-4 grid gap-2 border-t border-[#dbe1d8] pt-4 text-xs text-[#68766d]">
              <p>Station: {data.station.name}</p>
              <p>Records analyzed: {data.records.length}</p>
              {data.aiFinishReason ? <p>AI finish reason: {data.aiFinishReason}</p> : null}
              <p>Source: {data.source === "kloudtrack" ? "KloudTrack API" : "Demo fallback"}</p>
            </div>
          ) : null}
        </aside>
      ) : null}

      <button
        className="chat-launcher"
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-controls="telemetry-copilot-panel"
        aria-expanded={open}
        aria-label={launcherLabel}
        title={launcherLabel}
      >
        <MessageCircle className="h-5 w-5" aria-hidden="true" />
        {hasAnswer ? (
          <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-[#fbfcfa] bg-[#b9472b]" />
        ) : null}
      </button>
    </div>
  );
}
