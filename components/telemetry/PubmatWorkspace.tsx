"use client";

import { useState } from "react";
import type { InvestigationMetricKey } from "@/lib/telemetry-types";
import type { MetricOption, PubmatQuickFetchResponse } from "./types";
import { PubmatChatPanel } from "./PubmatChatPanel";
import { PubmatQuickFetch } from "./PubmatQuickFetch";

export function PubmatWorkspace({
  autoRun,
  initialIntervalMinutes,
  initialMetric,
  metrics,
}: {
  autoRun: boolean;
  initialIntervalMinutes: number;
  initialMetric: InvestigationMetricKey;
  metrics: MetricOption[];
}) {
  const [pubmatData, setPubmatData] = useState<PubmatQuickFetchResponse | null>(null);

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
      <PubmatQuickFetch
        autoRun={autoRun}
        initialIntervalMinutes={initialIntervalMinutes}
        initialMetric={initialMetric}
        metrics={metrics}
        onDataChange={setPubmatData}
      />
      <PubmatChatPanel data={pubmatData} />
    </div>
  );
}
