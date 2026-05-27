import { assertInternalAccess } from "@/lib/auth";
import {
  getDashboardDataFromKloudtrackApi,
  normalizeDashboardStations,
} from "@/lib/kloudtrack-api";
import { demoStations } from "@/lib/mock-telemetry";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = assertInternalAccess(request);
  if (denied) return denied;

  if (!process.env.KLOUDTRACK_API_TOKEN) {
    return Response.json({
      stations: demoStations,
      source: "demo",
      reason: "KLOUDTRACK_API_TOKEN is not configured.",
    });
  }

  try {
    const dashboard = await getDashboardDataFromKloudtrackApi();
    return Response.json({
      stations: normalizeDashboardStations(dashboard),
      source: "kloudtrack",
    });
  } catch (error) {
    return Response.json(
      {
        error: "Station list failed",
        message: error instanceof Error ? error.message : "Unknown dashboard API error",
      },
      { status: 502 },
    );
  }
}
