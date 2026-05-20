# Internal Telemetry AI Copilot Architecture

## Processing Flow

1. Operator selects station, metric, time range, and aggregation interval.
2. The dashboard calls `POST /api/investigations`.
3. The server fetches history from KloudTrack API using `x-kloudtrack-key`.
4. Responses are normalized into `{ station, records[] }`.
5. `lib/telemetry-analysis.ts` deterministically computes summaries, gaps, duplicates, spikes, flatlines, thresholds, and interval buckets.
6. `lib/ai-context.ts` builds a compressed JSON payload and prompt.
7. The AI layer explains computed findings only.

## Endpoint Strategy

- Weather metrics: `/telemetry/station/{stationId}/history/{variable}`
- Water level: `/water-level/station/{stationId}/history/calculatedWaterLevel`
- Rain gauge: `/rain-gauge/station/{stationId}/history/mm`

The root `monitorConstant.ts` file documents the upstream API contract and is supported by a local `Endpoint` type so it remains compile-safe.

## Queue Strategy

BullMQ workers can be added for:

- hourly aggregation cache refresh
- anomaly analysis
- scheduled operational summaries
- AI incident report generation
- dead-letter handling for failed upstream API calls

## Token Strategy

Raw minute arrays are omitted from AI prompts. Context contains interval summaries, significant readings, warning crossings, spikes, missing periods, duplicate timestamps, flatlines, and token estimates.
