import { buildAiPrompt, buildInvestigationContext, explainFindings } from "@/lib/ai-context";
import { assertInternalAccess, writeAuditEvent } from "@/lib/auth";
import { generateGeminiAnswer } from "@/lib/gemini";
import {
  getTelemetryMetricHistoryFromKloudtrackApi,
  normalizeTelemetry,
} from "@/lib/kloudtrack-api";
import { getMetricAnalysisProfile } from "@/lib/metric-profiles";
import { createDemoTelemetry } from "@/lib/mock-telemetry";
import { analyzeTelemetry, defaultWarningLevels, findPointInTime } from "@/lib/telemetry-analysis";
import type { InvestigationSelection, MetricKey } from "@/lib/telemetry-types";

export const dynamic = "force-dynamic";

const validMetrics: MetricKey[] = [
  "temperature",
  "humidity",
  "pressure",
  "heatIndex",
  "windDirection",
  "windSpeed",
  "precipitation",
  "rainfall",
  "uvIndex",
  "distance",
  "calculatedWaterLevel",
  "lightIntensity",
];

export async function POST(request: Request) {
  const denied = assertInternalAccess(request);
  if (denied) return denied;

  try {
    const body = (await request.json()) as Partial<InvestigationSelection> & {
      question?: string;
      pointTimestamp?: string;
      useDemoData?: boolean;
    };

    const requestedDemoData = body.useDemoData ?? false;
    const selection = parseSelection(body);
    const source = await loadTelemetry(selection, requestedDemoData);
    const analysis = analyzeTelemetry(source.records, defaultWarningLevels, {
      start: selection.start,
      end: selection.end,
      aggregationMinutes: selection.aggregationMinutes,
      metricProfile: getMetricAnalysisProfile(selection.metric),
    });
    const context = buildInvestigationContext(
      source.station,
      selection.metric,
      selection,
      analysis,
      defaultWarningLevels,
      source.records.length,
    );
    const prompt = buildAiPrompt(
      context,
      body.question || "Summarize the selected telemetry range.",
    );
    const pointMatch = body.pointTimestamp
      ? findPointInTime(source.records, body.pointTimestamp)
      : null;
    const deterministicAnswer = explainFindings(
      context,
      body.question || "Summarize the selected telemetry range.",
    );
    const aiResult = await generateAnswer(prompt, deterministicAnswer);

    writeAuditEvent({
      action: "investigation.run",
      stationId: selection.stationId,
      metric: selection.metric,
      start: selection.start,
      end: selection.end,
      promptTokensEstimated: context.tokenBudget.estimatedTokens,
      aiProvider: aiResult.provider,
    });

    return Response.json({
      selection,
      station: source.station,
      analysis,
      context,
      prompt,
      pointMatch,
      answer: aiResult.answer,
      aiProvider: aiResult.provider,
      aiError: aiResult.error,
      records: source.records,
      source: requestedDemoData || !process.env.KLOUDTRACK_API_TOKEN ? "demo" : "kloudtrack",
    });
  } catch (error) {
    return Response.json(
      {
        error: "Investigation failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 },
    );
  }
}

async function generateAnswer(
  prompt: string,
  fallbackAnswer: string,
): Promise<{ answer: string; provider: "gemini" | "deterministic"; error?: string }> {
  if (!process.env.GEMINI_API_KEY) {
    return { answer: fallbackAnswer, provider: "deterministic" };
  }

  try {
    return {
      answer: await generateGeminiAnswer(prompt),
      provider: "gemini",
    };
  } catch (error) {
    return {
      answer: fallbackAnswer,
      provider: "deterministic",
      error: error instanceof Error ? error.message : "Gemini request failed.",
    };
  }
}

function parseSelection(
  body: Partial<InvestigationSelection>,
): InvestigationSelection {
  const metric = body.metric && validMetrics.includes(body.metric)
    ? body.metric
    : "calculatedWaterLevel";
  const end = body.end ? new Date(body.end) : new Date();
  const start = body.start
    ? new Date(body.start)
    : new Date(end.getTime() - 24 * 60 * 60_000);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Invalid start or end timestamp.");
  }
  if (start >= end) {
    throw new Error("Start timestamp must be earlier than end timestamp.");
  }

  return {
    stationId: body.stationId || "station-001",
    metric,
    start: start.toISOString(),
    end: end.toISOString(),
    aggregationMinutes: body.aggregationMinutes ?? 60,
  };
}

async function loadTelemetry(selection: InvestigationSelection, useDemoData: boolean) {
  if (useDemoData || !process.env.KLOUDTRACK_API_TOKEN) {
    return createDemoTelemetry(
      selection.stationId,
      selection.metric,
      selection.start,
      selection.end,
    );
  }

  const raw = await getTelemetryMetricHistoryFromKloudtrackApi(
    selection.stationId,
    selection.metric,
    {
      skip: "0",
      take: "2000",
      interval: "1",
      startDate: selection.start,
      endDate: selection.end,
    },
  );

  return normalizeTelemetry(raw);
}
