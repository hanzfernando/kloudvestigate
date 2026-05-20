import type { MetricOption } from "./types";

export const metrics: MetricOption[] = [
  { label: "All", value: "all" },
  { label: "Temperature", value: "temperature" },
  { label: "Humidity", value: "humidity" },
  { label: "Heat Index", value: "heatIndex" },
  { label: "Pressure", value: "pressure" },
  { label: "Wind speed", value: "windSpeed" },
  { label: "Light", value: "lightIntensity" },
  { label: "UV Index", value: "uvIndex"},
  { label: "Rainfall", value: "rainfall" },

];

export const questions = [
  "Summarize the trend from the selected range.",
  "What timestamps did the data spike?",
  "Did the station cross warning thresholds?",
  "Were there missing telemetry records?",
  "Which hour had the highest reading?",
];
