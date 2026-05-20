import type { MetricOption } from "./types";

export const metrics: MetricOption[] = [
  { label: "Water level", value: "calculatedWaterLevel" },
  { label: "Sensor distance", value: "distance" },
  { label: "Rainfall", value: "rainfall" },
  { label: "Temperature", value: "temperature" },
  { label: "Heat Index", value: "heatIndex" },
  { label: "Humidity", value: "humidity" },
  { label: "Pressure", value: "pressure" },
  { label: "Wind speed", value: "windSpeed" },
  { label: "Light", value: "lightIntensity" },
];

export const questions = [
  "Summarize the trend from the selected range.",
  "What timestamps did the data spike?",
  "Did the station cross warning thresholds?",
  "Were there missing telemetry records?",
  "Which hour had the highest reading?",
];
