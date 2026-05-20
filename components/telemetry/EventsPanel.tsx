import type { TelemetryAnalysis } from "@/lib/telemetry-types";
import { EventList } from "./EventList";
import { formatTime } from "./utils";

export function EventsPanel({ analysis }: { analysis?: TelemetryAnalysis }) {
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <EventList
          title="Spike Events"
          empty="No spikes detected"
          tone="caution"
          items={(analysis?.spikes ?? []).map((item) => ({
            primary: formatTime(item.timestamp),
            secondary: `${item.previousValue} to ${item.currentValue} (${item.difference}); limit ${item.limit}`,
          }))}
        />
        <EventList
          title="Acceptable Range"
          empty="No range violations"
          tone="danger"
          items={(analysis?.rangeViolations ?? []).map((item) => ({
            primary: formatTime(item.timestamp),
            secondary: `${item.value} is ${item.direction} configured range ${item.minimum} to ${item.maximum}`,
          }))}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <EventList
          title="Data Quality"
          empty="No missing periods or duplicates"
          items={[
            ...(analysis?.missingPeriods ?? []).map((item) => ({
              primary: `${formatTime(item.start)} to ${formatTime(item.end)}`,
              secondary: `${item.missingCount} missing minute records`,
            })),
            ...(analysis?.duplicateTimestamps ?? []).map((item) => ({
              primary: formatTime(item.timestamp),
              secondary: `${item.count} duplicate records`,
            })),
          ]}
        />
      </div>
    </>
  );
}
