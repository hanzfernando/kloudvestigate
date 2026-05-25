import type { MetricAnalysisProfile, MetricKey } from "./telemetry-types";

export const allMetricKeys: MetricKey[] = [
  "temperature",
  "humidity",
  "pressure",
  "heatIndex",
  "windDirection",
  "windSpeed",
  "precipitation",
  "rainfall",
  "uvIndex",
  "lightIntensity",
];

export const metricAnalysisProfiles: Record<MetricKey, MetricAnalysisProfile> = {
  temperature: {
    metric: "temperature",
    label: "Temperature",
    unit: "C",
    acceptableRange: { minimum: -10, maximum: 55 },
    spikeDelta: 3,
    flatlineMinutes: 45,
  },
  humidity: {
    metric: "humidity",
    label: "Humidity",
    unit: "%",
    acceptableRange: { minimum: 0, maximum: 100 },
    spikeDelta: 12,
    flatlineMinutes: 60,
  },
  pressure: {
    metric: "pressure",
    label: "Pressure",
    unit: "hPa",
    acceptableRange: { minimum: 850, maximum: 1100 },
    spikeDelta: 5,
    flatlineMinutes: 60,
  },
  heatIndex: {
    metric: "heatIndex",
    label: "Heat index",
    unit: "C",
    acceptableRange: { minimum: -10, maximum: 65 },
    spikeDelta: 3,
    flatlineMinutes: 45,
  },
  windDirection: {
    metric: "windDirection",
    label: "Wind direction",
    unit: "deg",
    acceptableRange: { minimum: 0, maximum: 360 },
    spikeDelta: 90,
    flatlineMinutes: 120,
  },
  windSpeed: {
    metric: "windSpeed",
    label: "Wind speed",
    unit: "m/s",
    acceptableRange: { minimum: 0, maximum: 80 },
    spikeDelta: 10,
    flatlineMinutes: 45,
  },
  precipitation: {
    metric: "precipitation",
    label: "Precipitation",
    unit: "mm",
    acceptableRange: { minimum: 0, maximum: 300 },
    spikeDelta: 20,
    flatlineMinutes: 180,
  },
  rainfall: {
    metric: "rainfall",
    label: "Rainfall",
    unit: "mm",
    acceptableRange: { minimum: 0, maximum: 300 },
    spikeDelta: 20,
    flatlineMinutes: 180,
  },
  uvIndex: {
    metric: "uvIndex",
    label: "UV index",
    unit: "index",
    acceptableRange: { minimum: 0, maximum: 11 },
    spikeDelta: 10,
    flatlineMinutes: 60,
  },
  lightIntensity: {
    metric: "lightIntensity",
    label: "Light intensity",
    unit: "lux",
    acceptableRange: { minimum: 0, maximum: 120000 },
    spikeDelta: 30000,
    flatlineMinutes: 90,
  },
};

export function getMetricAnalysisProfile(metric: MetricKey): MetricAnalysisProfile {
  return metricAnalysisProfiles[metric];
}
