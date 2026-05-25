import Link from "next/link";
import architectureData from "@/docs/project-architecture.json";
import { MermaidDiagram } from "@/components/architecture/MermaidDiagram";

type ArchitectureData = typeof architectureData;

const data = architectureData as ArchitectureData;

export default function ArchitecturePage() {
  return (
    <main className="min-h-screen bg-[#f4f6f3] px-5 py-6 text-[#18211d]">
      <div className="mx-auto max-w-337.5">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#537062]">System design</p>
            <h1 className="mt-2 text-3xl font-semibold">Telemetry Copilot Architecture</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#526258]">
              {data.project.tokenSavingSummary}
            </p>
          </div>
          <nav className="flex flex-wrap gap-2 text-sm">
            <Link className="nav-pill" href="/">Dashboard</Link>
            <Link className="nav-pill" href="/pubmat">Pubmat</Link>
            <Link className="nav-pill" href="/config">Metric config</Link>
          </nav>
        </div>

        <section className="grid gap-4 lg:grid-cols-3">
          <Info title="Project" items={[
            data.project.purpose,
            data.project.framework,
            `Architecture source: docs/project-architecture.json`,
          ]} />
          <Info title="Client Side" items={data.runtime.client} />
          <Info title="Server Side" items={data.runtime.server} />
        </section>

        <section className="mt-4 grid gap-4">
          {data.diagrams.map((diagram) => (
            <div className="panel" key={diagram.id}>
              <div className="flex flex-col gap-1">
                <h2 className="panel-title">{diagram.title}</h2>
                <p className="text-sm leading-6 text-[#526258]">{diagram.description}</p>
              </div>
              <MermaidDiagram chart={diagram.mermaid} title={diagram.title} />
            </div>
          ))}
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="panel">
            <h2 className="panel-title">Major Modules</h2>
            <div className="mt-4 grid gap-3">
              {data.majorModules.map((module) => (
                <div className="rounded border border-[#dbe1d8] bg-white p-3" key={module.name}>
                  <h3 className="font-semibold text-[#1f2d25]">{module.name}</h3>
                  <p className="mt-1 text-sm leading-6 text-[#39483f]">{module.responsibility}</p>
                  <p className="mt-2 font-mono text-xs leading-5 text-[#607065]">{module.paths.join(", ")}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            <Info title="Security" items={data.security} />
            <Info title="Environment" items={data.environment} />
          </div>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="panel">
            <h2 className="panel-title">Database Schema</h2>
            <div className="mt-4 grid gap-3">
              {data.database.map((model) => (
                <div className="rounded border border-[#dbe1d8] bg-white p-3" key={model.model}>
                  <h3 className="font-mono text-sm font-semibold text-[#1f2d25]">{model.model}</h3>
                  <p className="mt-1 text-sm leading-6 text-[#39483f]">{model.notes}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <h2 className="panel-title">Future Work</h2>
            <ul className="mt-3 grid gap-2 text-sm leading-6 text-[#39483f]">
              {data.futureWork.map((item) => <li key={item}>{item}</li>)}
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
