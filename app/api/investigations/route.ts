import { buildAiPrompt, buildInvestigationContext, explainFindings } from "@/lib/ai-context";
import { assertInternalAccess, writeAuditEvent } from "@/lib/auth";
import { generateGeminiAnswer } from "@/lib/gemini";
import {
  getAllTelemetryHistoryFromKloudtrackApi,
  getTelemetryMetricHistoryFromKloudtrackApi,
  normalizeAllTelemetry,
  normalizeTelemetry,
} from "@/lib/kloudtrack-api";
import { allMetricKeys, getMetricAnalysisProfile } from "@/lib/metric-profiles";
import { createDemoTelemetry } from "@/lib/mock-telemetry";
import { analyzeTelemetry, defaultWarningLevels, findPointInTime } from "@/lib/telemetry-analysis";
import type {
  InvestigationMetricKey,
  InvestigationSelection,
  MetricKey,
  StationMetadata,
  TelemetryAnalysis,
  TelemetryRecord,
} from "@/lib/telemetry-types";

export const dynamic = "force-dynamic";

const validMetrics: InvestigationMetricKey[] = [
  "all",
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
      askCopilot?: boolean;
      useDemoData?: boolean;
    };

    const requestedDemoData = body.useDemoData ?? false;
    const askCopilot = body.askCopilot ?? false;
    const selection = parseSelection(body);
    const source = await loadTelemetry(selection, requestedDemoData);
    const metricAnalyses = analyzeMetricSeries(source.series, selection);
    const primary = metricAnalyses[0];
    if (!primary) throw new Error("No telemetry records were available for the selected metric.");

    const context = buildInvestigationContext(
      source.station,
      primary.metric,
      selection,
      primary.analysis,
      defaultWarningLevels,
      primary.records.length,
    );
    const question = body.question || "Summarize the selected telemetry range.";
    const prompt = askCopilot ? buildAiPrompt(context, question) : null;
    const pointMatch = body.pointTimestamp
      ? findPointInTime(primary.records, body.pointTimestamp)
      : null;
    const deterministicAnswer = askCopilot ? explainFindings(context, question) : null;
    const aiResult = prompt && deterministicAnswer
      ? await generateAnswer(prompt, deterministicAnswer)
      : null;

    writeAuditEvent({
      action: "investigation.run",
      askCopilot,
      stationId: selection.stationId,
      metric: selection.metric,
      start: selection.start,
      end: selection.end,
      promptTokensEstimated: context.tokenBudget.estimatedTokens,
      aiProvider: aiResult?.provider ?? null,
    });

    return Response.json({
      selection,
      station: source.station,
      analysis: primary.analysis,
      context,
      prompt,
      pointMatch,
      answer: aiResult?.answer ?? null,
      aiProvider: aiResult?.provider ?? null,
      aiError: aiResult?.error,
      records: primary.records,
      metricAnalyses,
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

async function loadTelemetry(selection: InvestigationSelection, useDemoData: boolean): Promise<{
  station: StationMetadata;
  series: Array<{ metric: MetricKey; records: TelemetryRecord[] }>;
}> {
  if (selection.metric === "all") {
    return loadAllTelemetry(selection, useDemoData);
  }

  if (useDemoData || !process.env.KLOUDTRACK_API_TOKEN) {
    const demo = createDemoTelemetry(
      selection.stationId,
      selection.metric,
      selection.start,
      selection.end,
    );
    return {
      station: demo.station,
      series: [{ metric: selection.metric, records: demo.records }],
    };
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

  const normalized = normalizeTelemetry(raw);
  return {
    station: normalized.station,
    series: [{ metric: selection.metric, records: normalized.records }],
  };
}

async function loadAllTelemetry(selection: InvestigationSelection, useDemoData: boolean) {
  if (useDemoData || !process.env.KLOUDTRACK_API_TOKEN) {
    const demoSeries = allMetricKeys.map((metric) => {
      const demo = createDemoTelemetry(selection.stationId, metric, selection.start, selection.end);
      return { metric, records: demo.records, station: demo.station };
    });
    return {
      station: demoSeries[0].station,
      series: demoSeries.map(({ metric, records }) => ({ metric, records })),
    };
  }

  const raw = await getAllTelemetryHistoryFromKloudtrackApi(selection.stationId, {
    skip: "0",
    take: "2000",
    interval: "1",
    startDate: selection.start,
    endDate: selection.end,
  });
  return normalizeAllTelemetry(raw);
}

function analyzeMetricSeries(
  series: Array<{ metric: MetricKey; records: TelemetryRecord[] }>,
  selection: InvestigationSelection,
): Array<{ metric: MetricKey; analysis: TelemetryAnalysis; records: TelemetryRecord[] }> {
  return series.map((item) => ({
    metric: item.metric,
    records: item.records,
    analysis: analyzeTelemetry(item.records, defaultWarningLevels, {
      start: selection.start,
      end: selection.end,
      aggregationMinutes: selection.aggregationMinutes,
      metricProfile: getMetricAnalysisProfile(item.metric),
    }),
  }));
}
