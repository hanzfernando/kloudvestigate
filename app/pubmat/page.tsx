import Link from "next/link";
import { PubmatQuickFetch } from "@/components/telemetry/PubmatQuickFetch";
import { metrics } from "@/components/telemetry/constants";
import { allMetricKeys } from "@/lib/metric-profiles";
import type { InvestigationMetricKey, MetricKey } from "@/lib/telemetry-types";

type PubmatPageProps = {
  searchParams: Promise<{ metric?: string; interval?: string; run?: string }>;
};

export default async function PubmatPage({ searchParams }: PubmatPageProps) {
  const params = await searchParams;
  const initialMetric = parseMetric(params.metric);
  const initialIntervalMinutes = parseInterval(params.interval);
  const autoRun = params.run === "1" || params.run === "true";

  return (
    <div className="min-h-screen bg-[#f4f6f3] text-[#18211d]">
      <header className="border-b border-[#d8ded5] bg-[#fbfcfa]">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-5 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#537062]">
              Pubmat data prep
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-normal sm:text-3xl">
              Station Aggregate Table
            </h1>
          </div>
          <nav className="flex flex-wrap gap-2 text-sm">
            <Link className="nav-pill" href="/">Investigation dashboard</Link>
            <Link className="nav-pill" href="/architecture">Architecture</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1500px] gap-5 px-5 py-5">
        <PubmatQuickFetch
          autoRun={autoRun}
          initialIntervalMinutes={initialIntervalMinutes}
          initialMetric={initialMetric}
          metrics={metrics}
        />
      </main>
    </div>
  );
}

function parseMetric(value?: string): InvestigationMetricKey {
  if (value === "all") return "all";
  return allMetricKeys.includes(value as MetricKey)
    ? value as MetricKey
    : "rainfall";
}

function parseInterval(value?: string) {
  const interval = Number(value);
  return Number.isFinite(interval) && interval > 0 ? interval : 60;
}
