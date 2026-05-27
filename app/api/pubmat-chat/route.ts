import { assertInternalAccess } from "@/lib/auth";
import { generateGeminiAnswer } from "@/lib/gemini";
import { getMetricAnalysisProfile } from "@/lib/metric-profiles";
import type { MetricKey } from "@/lib/telemetry-types";
import type { PubmatQuickFetchResponse, PubmatQuickFetchResult } from "@/components/telemetry/types";

export const dynamic = "force-dynamic";

interface PubmatChatBody {
  question?: string;
  pubmat?: PubmatQuickFetchResponse;
}

export async function POST(request: Request) {
  const denied = assertInternalAccess(request);
  if (denied) return denied;

  try {
    const body = (await request.json()) as PubmatChatBody;
    const question = body.question?.trim() || "Summarize this pubmat table for publication.";
    const pubmat = validatePubmat(body.pubmat);
    const deterministicAnswer = summarizePubmat(pubmat, question);

    if (!process.env.GEMINI_API_KEY) {
      return Response.json({
        answer: deterministicAnswer,
        aiProvider: "deterministic",
        fallbackReason: "GEMINI_API_KEY is not configured. Response came from internal formatting.",
      });
    }

    try {
      const result = await generateGeminiAnswer(buildPubmatPrompt(pubmat, question));
      return Response.json({
        answer: result.answer,
        aiProvider: "gemini",
        aiWarning: result.warning,
        aiFinishReason: result.finishReason,
      });
    } catch (error) {
      return Response.json({
        answer: deterministicAnswer,
        aiProvider: "deterministic",
        aiError: error instanceof Error ? error.message : "Gemini request failed.",
        fallbackReason: "Gemini request failed. Response came from internal formatting.",
      });
    }
  } catch (error) {
    return Response.json(
      {
        error: "Pubmat chat failed",
        message: error instanceof Error ? error.message : "Unknown pubmat chat error",
      },
      { status: 400 },
    );
  }
}

function validatePubmat(pubmat: PubmatChatBody["pubmat"]): PubmatQuickFetchResponse {
  if (!pubmat || !Array.isArray(pubmat.results) || !pubmat.window || !pubmat.selection) {
    throw new Error("Pubmat table data is required.");
  }

  return pubmat;
}

function buildPubmatPrompt(pubmat: PubmatQuickFetchResponse, question: string) {
  const metricLabels = pubmat.selection.selectedMetricKeys
    .map((metric) => `${metric}: ${getMetricAnalysisProfile(metric).label}`)
    .join(", ");
  const rows = pubmat.results.map((result) => formatResultRow(result, pubmat.selection.selectedMetricKeys)).join("\n");

  return [
    "You are a telemetry analyst helping prepare a concise public information material table.",
    "Answer only from the supplied pubmat table. If the table does not support the answer, say what is missing.",
    "Use short, publication-ready wording. Mention stations needing review when relevant.",
    "If the user asks for a tabular format, return a GitHub-flavored Markdown pipe table with a header separator row.",
    "For grouping/ranking requests, group by province/state first, then city/municipality, and rank stations inside each city by the requested metric value.",
    "",
    `Question: ${question}`,
    `Source: ${pubmat.source}`,
    `Target bucket UTC: ${pubmat.window.bucketStart} to ${pubmat.window.bucketEnd}`,
    `Fetch window UTC: ${pubmat.window.fetchStart} to ${pubmat.window.fetchEnd}`,
    `Interval minutes: ${pubmat.selection.intervalMinutes}`,
    `Metrics: ${metricLabels}`,
    "",
    "Rows:",
    rows || "No rows returned.",
  ].join("\n");
}

function summarizePubmat(pubmat: PubmatQuickFetchResponse, question = "") {
  if (asksForGroupedRanking(question)) {
    return buildGroupedRankingTable(pubmat);
  }

  const readyCount = pubmat.results.filter((result) => result.status === "ready").length;
  const review = pubmat.results.filter((result) => result.status === "attention");
  const missing = pubmat.results.filter((result) => result.status === "missing" || result.status === "failed");
  const metricLabels = pubmat.selection.selectedMetricKeys
    .map((metric) => getMetricAnalysisProfile(metric).label)
    .join(", ");

  return [
    `Fetched ${pubmat.results.length} station row(s) for ${metricLabels}.`,
    `${readyCount} station(s) are ready, ${review.length} need review, and ${missing.length} are missing or failed.`,
    review.length ? `Review: ${review.map((result) => result.station.name).join(", ")}.` : "No review-classified station rows were found.",
    missing.length ? `Missing/failed: ${missing.map((result) => result.station.name).join(", ")}.` : "No missing or failed station rows were found.",
  ].join("\n\n");
}

function asksForGroupedRanking(question: string) {
  const normalized = question.toLowerCase();
  return (
    (normalized.includes("group") || normalized.includes("province") || normalized.includes("city") || normalized.includes("municipality")) &&
    (normalized.includes("rank") || normalized.includes("table") || normalized.includes("tabular"))
  );
}

function buildGroupedRankingTable(pubmat: PubmatQuickFetchResponse) {
  const metricKeys = pubmat.selection.selectedMetricKeys;
  const rankMetric = metricKeys[0];
  const rankMetricLabel = getMetricAnalysisProfile(rankMetric).label;
  const rows = [...pubmat.results]
    .sort((a, b) => {
      const locationSort = getProvince(a).localeCompare(getProvince(b))
        || getCity(a).localeCompare(getCity(b));
      if (locationSort) return locationSort;

      return getRankValue(b, rankMetric) - getRankValue(a, rankMetric)
        || a.station.name.localeCompare(b.station.name);
    });

  const rankByLocation = new Map<string, number>();
  const tableRows = rows.map((result) => {
    const locationKey = `${getProvince(result)}|${getCity(result)}`;
    const rank = (rankByLocation.get(locationKey) ?? 0) + 1;
    rankByLocation.set(locationKey, rank);

    return [
      getProvince(result),
      getCity(result),
      String(rank),
      result.station.name,
      ...metricKeys.map((metric) => formatMetricValue(result.values[metric])),
      result.status,
      result.error ?? (result.classifications.join(", ") || "ok"),
    ];
  });

  const headers = [
    "Province",
    "City/Municipality",
    `Rank in City by ${rankMetricLabel}`,
    "Station",
    ...metricKeys.map((metric) => getMetricAnalysisProfile(metric).label),
    "Status",
    "Notes",
  ];

  return [
    `Grouped and ranked by province, then city/municipality. Ranking uses ${rankMetricLabel} in descending order within each city/municipality.`,
    "",
    buildMarkdownTable(headers, tableRows),
  ].join("\n");
}

function formatResultRow(result: PubmatQuickFetchResult, metricKeys: MetricKey[]) {
  const values = metricKeys
    .map((metric) => {
      const label = getMetricAnalysisProfile(metric).label;
      const value = result.values[metric];
      return `${label}=${value === undefined ? "n/a" : value}`;
    })
    .join(", ");
  const notes = result.error ?? (result.classifications.join(", ") || "ok");

  return [
    result.station.id,
    result.station.name,
    `province=${result.station.state || "n/a"}`,
    result.station.city,
    `status=${result.status}`,
    values,
    `notes=${notes}`,
  ].join(" | ");
}

function getProvince(result: PubmatQuickFetchResult) {
  return result.station.state || "Unspecified";
}

function getCity(result: PubmatQuickFetchResult) {
  return result.station.city || "Unspecified";
}

function getRankValue(result: PubmatQuickFetchResult, metric: MetricKey) {
  const value = result.values[metric];
  return value === undefined ? Number.NEGATIVE_INFINITY : value;
}

function formatMetricValue(value?: number) {
  return value === undefined ? "n/a" : value.toFixed(2);
}

function buildMarkdownTable(headers: string[], rows: string[][]) {
  return [
    `| ${headers.map(escapeTableCell).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(escapeTableCell).join(" | ")} |`),
  ].join("\n");
}

function escapeTableCell(value: string) {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}
