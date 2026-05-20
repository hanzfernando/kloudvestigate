import type { MetricKey, StationMetadata, TelemetryRecord } from "./telemetry-types";

export const demoStations: StationMetadata[] = [
  {
    id: "station-001",
    name: "River Station Alpha",
    type: "water-level",
    location: [14.5995, 120.9842],
    city: "Manila",
    state: "Metro Manila",
    organizationName: "Internal Monitoring",
    isActive: true,
  },
  {
    id: "station-014",
    name: "Pump House Delta",
    type: "rainfall",
    location: [14.676, 121.0437],
    city: "Quezon City",
    state: "Metro Manila",
    organizationName: "Internal Monitoring",
    isActive: true,
  },
];

export function createDemoTelemetry(
  stationId: string,
  metric: MetricKey,
  start: string,
  end: string,
): { station: StationMetadata; records: TelemetryRecord[] } {
  const station = demoStations.find((item) => item.id === stationId) ?? demoStations[0];
  const startTime = Date.parse(start);
  const endTime = Date.parse(end);
  const records: TelemetryRecord[] = [];
  const metricOffset = metric.length % 5;

  for (let time = startTime; time <= endTime; time += 60_000) {
    const minute = Math.floor((time - startTime) / 60_000);
    const hour = new Date(time).getUTCHours();

    if ((minute >= 183 && minute <= 188) || minute === 425 || minute === 426) continue;

    const overnightDrift = hour < 6 ? 0.28 : 0;
    const wave = Math.sin(minute / 42) * 0.18 + Math.cos(minute / 107) * 0.09;
    const risingBand = minute > 720 && minute < 900 ? (minute - 720) / 220 : 0;
    const spike = minute === 852 ? 1.7 : minute === 982 ? -1.1 : 0;
    const flatline = minute >= 1040 && minute <= 1065;
    const base = metric === "precipitation" ? 1.1 : metric === "temperature" ? 27 : 2.75;
    const value = flatline
      ? 4.18
      : base + metricOffset * 0.08 + overnightDrift + wave + risingBand + spike;

    records.push({
      id: minute,
      timestamp: new Date(time).toISOString(),
      value: Number(value.toFixed(2)),
    });
  }

  if (records[35]) {
    records.splice(36, 0, { ...records[35], id: 9_999 });
  }

  return { station, records };
}
