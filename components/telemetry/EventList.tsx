export function EventList({
  title,
  empty,
  items,
  tone = "neutral",
}: {
  title: string;
  empty: string;
  items: Array<{ primary: string; secondary: string }>;
  tone?: "neutral" | "danger" | "caution";
}) {
  return (
    <div className="panel">
      <div className="flex items-center justify-between gap-3">
        <h2 className="panel-title">{title}</h2>
        <span className={`count-chip count-chip-${tone}`}>{items.length}</span>
      </div>
      <div className="mt-3 grid max-h-[320px] gap-2 overflow-auto pr-1">
        {items.length ? items.map((item) => (
          <div className={`event-row event-row-${tone}`} key={`${item.primary}-${item.secondary}`}>
            <p className="font-mono text-sm">{item.primary}</p>
            <p className="mt-1 text-sm text-[#5f6b63]">{item.secondary}</p>
          </div>
        )) : <p className="text-sm text-[#5f6b63]">{empty}</p>}
      </div>
    </div>
  );
}
