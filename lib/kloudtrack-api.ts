import type {
  MetricKey,
  StationMetadata,
  StationRaw,
  TelemetryHistoryMetricRaw,
  TelemetryRecord,
} from "./telemetry-types";
import { allMetricKeys } from "./metric-profiles";

const KLOUDTRACK_API_BASE_URL =
  process.env.KLOUDTRACK_API_BASE_URL || "https://api.kloudtechsea.com/api/v1";
const KLOUDTRACK_API_TOKEN = process.env.KLOUDTRACK_API_TOKEN;

interface KloudtrackApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface DashboardEntryRaw {
  station: StationRaw;
  telemetry: unknown | null;
}

type DashboardRaw = DashboardEntryRaw[] | { stations: DashboardEntryRaw[] };

class KloudtrackApiClient {
  constructor(
    private readonly baseURL: string,
    private readonly apiToken?: string,
  ) {}

  async get<T>(endpoint: string): Promise<T> {
    if (typeof window !== "undefined") {
      throw new Error("Kloudtrack API requests must run on the server");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(this.apiToken ? { "x-kloudtrack-key": this.apiToken } : {}),
        },
        cache: "no-store",
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Kloudtrack API Error: ${response.status} ${response.statusText}`);
      }

      const apiResponse = (await response.json()) as KloudtrackApiResponse<T>;
      if (!apiResponse.success) {
        throw new Error(apiResponse.message || "Kloudtrack API request failed");
      }
      return apiResponse.data;
    } finally {
      clearTimeout(timeout);
    }
  }
}

export const kloudtrackApi = new KloudtrackApiClient(
  KLOUDTRACK_API_BASE_URL,
  KLOUDTRACK_API_TOKEN,
);

export async function getTelemetryMetricHistoryFromKloudtrackApi(
  stationId: string,
  parameter: MetricKey,
  params: Record<string, string>,
): Promise<TelemetryHistoryMetricRaw> {
  const queryString = new URLSearchParams(params).toString();
  const { path, responseKey } = resolveHistoryEndpoint(stationId, parameter);
  const raw = await kloudtrackApi.get<TelemetryHistoryMetricRaw>(`${path}?${queryString}`);
  return {
    ...raw,
    telemetry: raw.telemetry ?? raw[responseKey] ?? [],
  };
}

export async function getAllTelemetryHistoryFromKloudtrackApi(
  stationId: string,
  params: Record<string, string>,
): Promise<TelemetryHistoryMetricRaw> {
  const queryString = new URLSearchParams(params).toString();
  return kloudtrackApi.get<TelemetryHistoryMetricRaw>(`/telemetry/station/${stationId}/history?${queryString}`);
}

export async function getDashboardDataFromKloudtrackApi(): Promise<DashboardRaw> {
  return kloudtrackApi.get<DashboardRaw>("/telemetry/dashboard");
}

export function normalizeStation(station: StationRaw): StationMetadata {
  const location = Array.isArray(station.location)
    ? station.location
    : station.location
      ? [station.location.lat, station.location.lng] as [number, number]
      : null;

  return {
    id: station.id,
    name: station.stationName,
    type: station.stationType,
    location,
    city: station.city,
    state: station.state,
    organizationName: station.organization?.organizationName ?? null,
    isActive: station.isActive,
  };
}

export function normalizeTelemetry(raw: TelemetryHistoryMetricRaw): {
  station: StationMetadata;
  records: TelemetryRecord[];
} {
  const telemetry = raw.telemetry ?? raw.waterLevel ?? raw.rainGauge ?? [];
  return {
    station: normalizeStation(raw.station),
    records: telemetry.map((record) => ({
      id: record.id,
      timestamp: new Date(record.recordedAt).toISOString(),
      value: Number(record.value),
    })).filter((record) => Number.isFinite(record.value)),
  };
}

export function normalizeAllTelemetry(raw: TelemetryHistoryMetricRaw): {
  station: StationMetadata;
  series: Array<{ metric: MetricKey; records: TelemetryRecord[] }>;
} {
  const telemetry = raw.telemetry ?? [];
  return {
    station: normalizeStation(raw.station),
    series: allMetricKeys
      .map((metric) => ({
        metric,
        records: telemetry
          .map((record) => {
            const value = readMetricValue(record, metric);
            return {
              id: record.id,
              timestamp: new Date(record.recordedAt).toISOString(),
              value: Number(value),
            };
          })
          .filter((record) => Number.isFinite(record.value)),
      }))
      .filter((item) => item.records.length > 0),
  };
}

export function normalizeDashboardStations(raw: DashboardRaw): StationMetadata[] {
  const entries = Array.isArray(raw) ? raw : raw.stations;
  return entries.map((entry) => normalizeStation(entry.station));
}

function resolveHistoryEndpoint(
  stationId: string,
  parameter: MetricKey,
): { path: string; responseKey: "telemetry" | "waterLevel" | "rainGauge" } {
  if (parameter === "rainfall") {
    return {
      path: `/rain-gauge/station/${stationId}/history/mm`,
      responseKey: "rainGauge",
    };
  }

  return {
    path: `/telemetry/station/${stationId}/history/${parameter}`,
    responseKey: "telemetry",
  };
}

function readMetricValue(
  record: NonNullable<TelemetryHistoryMetricRaw["telemetry"]>[number],
  metric: MetricKey,
): number | undefined {
  if (metric === "windDirection") return record.wind?.direction ?? record.windDirection;
  if (metric === "windSpeed") return record.wind?.speed ?? record.windSpeed;
  return record[metric];
}
