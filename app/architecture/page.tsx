import Link from "next/link";

const flows = [
  {
    title: "Frontend to Backend to AI",
    nodes: ["Operator dashboard", "Next route handler", "Deterministic analyzers", "Compressed AI context", "AI explanation"],
  },
  {
    title: "Internal API Integration",
    nodes: ["KloudTrack history endpoint", "Server API client", "Response normalizer", "Typed telemetry records", "Investigation service"],
  },
  {
    title: "Telemetry Analysis Pipeline",
    nodes: ["Minute records", "Deduplicate", "Find gaps", "Aggregate intervals", "Detect spikes and warnings", "Structured findings"],
  },
  {
    title: "Polling Lifecycle",
    nodes: ["Scope change", "Fetch on demand", "Cache summary", "Refresh stale view", "Audit access"],
  },
];

export default function ArchitecturePage() {
  return (
    <main className="min-h-screen bg-[#f4f6f3] px-5 py-6 text-[#18211d]">
      <div className="mx-auto max-w-[1300px]">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#537062]">System design</p>
            <h1 className="mt-2 text-3xl font-semibold">Telemetry Copilot Architecture</h1>
          </div>
          <Link className="nav-pill" href="/">Back to dashboard</Link>
        </div>

        <section className="grid gap-4 lg:grid-cols-3">
          <Info title="Frontend Architecture" items={[
            "Next.js App Router pages for operations, architecture, and AI context debugging.",
            "Client dashboard owns investigation controls and fetch-on-demand interactions.",
            "Charts render from interval summaries, not raw minute arrays.",
          ]} />
          <Info title="Backend Architecture" items={[
            "Route handlers act as a backend-for-frontend facade.",
            "Server-only KloudTrack client keeps x-kloudtrack-key out of the browser.",
            "Controller flow separates auth, fetching, normalization, analysis, and response shaping.",
          ]} />
          <Info title="Security Model" items={[
            "Internal token guard on investigation endpoints.",
            "Audit events emitted for investigation runs.",
            "Production deployments should put the app behind SSO/VPN and set INTERNAL_COPILOT_TOKEN.",
          ]} />
        </section>

        <section className="mt-4 grid gap-4">
          {flows.map((flow) => (
            <div className="panel" key={flow.title}>
              <h2 className="panel-title">{flow.title}</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-[repeat(5,minmax(0,1fr))]">
                {flow.nodes.map((node, index) => (
                  <div className="contents" key={node}>
                    <div className="diagram-node">
                      <p className="font-semibold">{node}</p>
                      <p className="mt-2 text-sm text-[#607065]">Step {index + 1}</p>
                    </div>
                    {index < flow.nodes.length - 1 ? <div className="diagram-arrow hidden md:block">→</div> : null}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="panel">
            <h2 className="panel-title">Database Schema</h2>
            <pre className="mt-3 overflow-x-auto rounded border border-[#dbe1d8] bg-white p-4 text-xs leading-5">{`Station
  id, externalId, name, type, city, isActive

TelemetryInvestigation
  id, stationId, metric, startAt, endAt, status
  question, answer, contextJson, prompt, tokenEstimate

AggregationCache
  stationId, metric, startAt, endAt, intervalMinutes, summaryJson

AuditLog
  actorId, action, resourceType, resourceId, metadata`}</pre>
          </div>
          <div className="panel">
            <h2 className="panel-title">Queue and Deployment Strategy</h2>
            <ul className="mt-3 grid gap-2 text-sm leading-6 text-[#39483f]">
              <li>BullMQ queues handle scheduled aggregation, anomaly analysis, AI summaries, and report generation.</li>
              <li>Redis stores job state, locks, and short-lived investigation cache entries.</li>
              <li>PostgreSQL stores audit logs, investigation contexts, cached summaries, users, roles, and station metadata snapshots.</li>
              <li>Docker Compose runs Next.js, PostgreSQL, Redis, and a future worker process; AWS deployment maps to ECS/Fargate or App Runner plus RDS and ElastiCache.</li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}

function Info({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="panel">
      <h2 className="panel-title">{title}</h2>
      <ul className="mt-3 grid gap-2 text-sm leading-6 text-[#39483f]">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}
