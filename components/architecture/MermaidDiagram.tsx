"use client";

import { useEffect, useId, useState } from "react";
import mermaid from "mermaid";

type MermaidDiagramProps = {
  chart: string;
  title: string;
};

mermaid.initialize({
  startOnLoad: false,
  securityLevel: "strict",
  theme: "base",
  themeVariables: {
    primaryColor: "var(--mermaid-primary)",
    primaryTextColor: "var(--foreground)",
    primaryBorderColor: "var(--mermaid-primary-border)",
    lineColor: "var(--mermaid-line)",
    secondaryColor: "var(--mermaid-secondary)",
    tertiaryColor: "var(--surface)",
    fontFamily: "Arial, Helvetica, sans-serif"
  }
});

export function MermaidDiagram({ chart, title }: MermaidDiagramProps) {
  const reactId = useId();
  const [svg, setSvg] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const diagramId = `architecture-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

    async function renderDiagram() {
      try {
        const result = await mermaid.render(diagramId, chart);
        if (!cancelled) {
          setSvg(result.svg);
          setError(null);
        }
      } catch (renderError) {
        if (!cancelled) {
          setSvg("");
          setError(renderError instanceof Error ? renderError.message : "Mermaid could not render this diagram.");
        }
      }
    }

    renderDiagram();

    return () => {
      cancelled = true;
    };
  }, [chart, reactId]);

  if (error) {
    return (
      <pre className="mt-4 overflow-x-auto rounded border border-danger-border bg-danger-surface-muted p-4 text-xs leading-5 text-danger-foreground-strong">
        {error}
      </pre>
    );
  }

  return (
    <div
      aria-label={title}
      className="mermaid-surface mt-4 overflow-x-auto rounded border border-border-subtle bg-surface p-4"
      dangerouslySetInnerHTML={{ __html: svg }}
      role="img"
    />
  );
}
