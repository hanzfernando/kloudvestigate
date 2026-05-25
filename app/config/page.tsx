import Link from "next/link";
import { MetricRangeConfigPanel } from "@/components/metric-config/MetricRangeConfigPanel";
import { readMetricRangeOverridesFromCookies } from "@/lib/metric-range-config.server";
import { allMetricKeys, getMetricAnalysisProfile } from "@/lib/metric-profiles";

export default async function ConfigPage() {
  const initialOverrides = await readMetricRangeOverridesFromCookies();
  const metrics = allMetricKeys.map((metric) => {
    const profile = getMetricAnalysisProfile(metric);
    const override = initialOverrides[metric];

    return {
      metric,
      label: profile.label,
      unit: profile.unit,
      defaultRange: profile.acceptableRange,
    };
  });

  return (
    <main className="min-h-screen bg-[#f4f6f3] px-5 py-6 text-[#18211d]">
      <div className="mx-auto max-w-350">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#537062]">Configuration</p>
            <h1 className="mt-2 text-3xl font-semibold">Metric Range Settings</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#526258]">
              Each metric starts from the range defined in <span className="font-mono">lib/metric-profiles.ts</span> and can be overridden here.
              Saved overrides apply to investigation analysis and pubmat classification.
            </p>
          </div>
          <nav className="flex flex-wrap gap-2 text-sm">
            <Link className="nav-pill" href="/">Dashboard</Link>
            <Link className="nav-pill" href="/pubmat">Pubmat</Link>
            <Link className="nav-pill" href="/architecture">Architecture</Link>
          </nav>
        </div>

        <MetricRangeConfigPanel initialOverrides={initialOverrides} metrics={metrics} />
      </div>
    </main>
  );
}