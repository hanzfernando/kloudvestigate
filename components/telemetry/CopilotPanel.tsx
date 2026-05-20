import type { MetricKey } from "@/lib/telemetry-types";
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
  metric: MetricKey;
  data: InvestigationResponse | null;
  loading: boolean;
  onQuestionChange: (value: string) => void;
  onRun: () => void;
}) {
  const metricLabel = data?.analysis.metricProfile.label ?? metric;
  const providerLabel = data?.aiProvider === "gemini" ? "Gemini" : "Deterministic";

  return (
    <aside className="panel h-fit xl:sticky xl:top-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between xl:flex-col xl:items-start">
        <div>
          <h2 className="panel-title">Copilot Response</h2>
          <p className="mt-1 text-sm text-[#5f6b63]">{metricLabel}</p>
        </div>
        {data?.aiProvider ? <span className="status-chip">{providerLabel}</span> : null}
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
          <p>Source: {data.source === "kloudtrack" ? "KloudTrack API" : "Demo fallback"}</p>
        </div>
      ) : null}
    </aside>
  );
}
