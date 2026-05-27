import { NextResponse } from "next/server";
import { assertInternalAccess } from "@/lib/auth";
import {
  METRIC_RANGE_OVERRIDES_COOKIE,
  normalizeMetricRangeOverrides,
  parseMetricRangeOverrides,
  serializeMetricRangeOverrides,
} from "@/lib/metric-range-config";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = assertInternalAccess(request);
  if (denied) return denied;

  return NextResponse.json({
    overrides: parseMetricRangeOverrides(extractCookieValue(request)),
  });
}

export async function POST(request: Request) {
  const denied = assertInternalAccess(request);
  if (denied) return denied;

  try {
    const body = (await request.json()) as { overrides?: unknown };
    const overrides = normalizeMetricRangeOverrides(body.overrides);
    const response = NextResponse.json({ overrides });

    response.cookies.set({
      name: METRIC_RANGE_OVERRIDES_COOKIE,
      value: serializeMetricRangeOverrides(overrides),
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error: "Metric range config save failed",
        message: error instanceof Error ? error.message : "Unknown config error",
      },
      { status: 400 },
    );
  }
}

function extractCookieValue(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(/(?:^|;\s*)kloudvestigate\.metric-range-overrides=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}