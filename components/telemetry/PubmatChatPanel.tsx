"use client";

import { useState } from "react";
import type { PubmatQuickFetchResponse } from "./types";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { formatTime } from "./utils";

interface PubmatChatResponse {
  answer: string;
  aiProvider: "gemini" | "deterministic";
  aiWarning?: string;
  aiFinishReason?: string;
  fallbackReason?: string;
  aiError?: string;
}

export function PubmatChatPanel({ data }: { data: PubmatQuickFetchResponse | null }) {
  const [question, setQuestion] = useState("Summarize this pubmat table for publication.");
  const [answer, setAnswer] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [finishReason, setFinishReason] = useState<string | null>(null);
  const [provider, setProvider] = useState<"gemini" | "deterministic" | null>(null);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function askPubmatCopilot() {
    if (!data) return;

    setLoading(true);
    setError(null);
    setWarning(null);
    setFinishReason(null);
    setFallbackReason(null);

    try {
      const response = await fetch("/api/pubmat-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, pubmat: data }),
      });

      if (!response.ok) throw new Error(`Pubmat chat failed (${response.status})`);

      const payload = (await response.json()) as PubmatChatResponse;
      setAnswer(payload.answer);
      setProvider(payload.aiProvider);
      setWarning(payload.aiWarning ?? null);
      setFinishReason(payload.aiFinishReason ?? null);
      setFallbackReason(payload.fallbackReason ?? null);
      setError(payload.aiError ?? null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unknown pubmat chat error");
    } finally {
      setLoading(false);
    }
  }

  const disabled = loading || !data;

  return (
    <aside className="panel h-fit xl:sticky xl:top-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between xl:flex-col xl:items-start">
        <div>
          <h2 className="panel-title">Pubmat Chat</h2>
          <p className="mt-1 text-sm text-[#5f6b63]">
            {data ? `${data.results.length} stations loaded` : "Fetch a table first"}
          </p>
        </div>
        {provider ? <span className="status-chip">{provider === "gemini" ? "Gemini" : "Deterministic"}</span> : null}
      </div>

      {data ? (
        <div className="mt-4 grid gap-2 rounded-[6px] border border-[#dbe1d8] bg-white p-3 text-xs text-[#68766d]">
          <p>Bucket: {formatTime(data.window.bucketStart)} to {formatTime(data.window.bucketEnd)}</p>
          <p>Metric: {data.selection.metric}</p>
          <p>Source: {data.source === "kloudtrack" ? "KloudTrack API" : "Demo fallback"}</p>
        </div>
      ) : null}

      <label className="field-label">
        Question
        <textarea
          className="field min-h-[112px] resize-y"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
        />
      </label>

      <button className="primary-action mt-3 w-full" type="button" onClick={() => void askPubmatCopilot()} disabled={disabled}>
        {loading ? "Asking" : "Ask about table"}
      </button>

      {error ? (
        <p className="mt-3 rounded-md border border-[#e1b0a2] bg-[#fff1ed] p-3 text-sm text-[#92351f]">
          {error}
        </p>
      ) : null}

      {fallbackReason ? (
        <p className="mt-3 rounded-md border border-[#dfc58d] bg-[#fff8e8] p-3 text-sm text-[#755010]">
          Internal formatting fallback: {fallbackReason}
        </p>
      ) : null}

      {warning ? (
        <p className="mt-3 rounded-md border border-[#dfc58d] bg-[#fff8e8] p-3 text-sm text-[#755010]">
          {warning}
        </p>
      ) : null}

      <div className="mt-4 border-t border-[#dbe1d8] pt-4 text-sm leading-6 text-[#26372d]">
        {answer ? (
          <MarkdownRenderer text={answer} />
        ) : data ? (
          <p className="text-[#68766d]">Ask a question about the fetched station table.</p>
        ) : (
          <p className="text-[#68766d]">Fetch the pubmat table, then ask for summary, anomalies, or caption-ready copy.</p>
        )}
      </div>

      {finishReason ? (
        <p className="mt-4 border-t border-[#dbe1d8] pt-4 text-xs text-[#68766d]">
          AI finish reason: {finishReason}
        </p>
      ) : null}
    </aside>
  );
}
