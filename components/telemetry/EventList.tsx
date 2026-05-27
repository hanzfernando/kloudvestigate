import { useMemo, useState } from "react";

interface EventListProps {
  title: string;
  empty: string;
  items: { primary: string; secondary: string }[];
  tone?: "neutral" | "caution" | "critical";
  maxVisible?: number;
}

export function EventList({ title, empty, items, tone = "neutral", maxVisible = 6 }: EventListProps) {
  const [expanded, setExpanded] = useState(false);
  const hasOverflow = items.length > maxVisible;
  const visibleItems = useMemo(
    () => (expanded ? items : items.slice(0, maxVisible)),
    [expanded, items, maxVisible],
  );
  const styleTone = tone === "critical" ? "danger" : tone;

  return (
    <div className="event-card rounded-lg border border-border bg-surface p-3 shadow-hairline">
      <div className="card-header">
        <span className="card-label">{title}</span>
        <span className={`count-chip count-chip-${styleTone}`}>{items.length}</span>
      </div>
      <div className="card-body mt-2 grid gap-2">
        {visibleItems.length
          ? visibleItems.map(item => (
              <div
                className={`event-row event-row-${styleTone}`}
                key={`${item.primary}-${item.secondary}`}
              >
                <p className="font-mono text-xs font-medium">{item.primary}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.secondary}</p>
              </div>
            ))
          : <p className="empty-state">{empty}</p>
        }
      </div>

      {hasOverflow && (
        <div className="mt-2 border-t border-border-faint pt-2">
          <button className="nav-pill w-full" type="button" onClick={() => setExpanded((current) => !current)}>
            {expanded ? "Show less" : `Show ${items.length - visibleItems.length} more`}
          </button>
        </div>
      )}
    </div>
  );
}