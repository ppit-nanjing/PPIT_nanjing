// Dependency-free donut chart (conic-gradient, no SVG/library) for the
// Google-Forms-style "per question" summary on /console/sensus's Analitik
// tab - reserved for distributions with a handful of options (gender,
// degree level, completion status, etc.). Larger-cardinality answers
// (university, province, entry year...) use SummaryList's bars instead,
// where a wedge-per-value donut would be unreadable.
//
// Colors cycle through the design system's own token palette (no new hex
// values) so this matches light/dark/city-theme switching automatically.
const SLICE_TOKENS = [
  "var(--color-primary-container)",
  "var(--color-secondary)",
  "var(--color-tertiary-container)",
  "var(--color-outline)",
  "var(--color-error-container)",
  "var(--color-on-surface-variant)",
];

export function DonutChart({ items }: { items: { label: string; count: number }[] }) {
  if (items.length === 0) return <p className="text-body-md text-on-surface-variant">Belum ada data.</p>;
  const total = items.reduce((sum, i) => sum + i.count, 0);
  if (total === 0) return <p className="text-body-md text-on-surface-variant">Belum ada data.</p>;

  let acc = 0;
  const stops: string[] = [];
  items.forEach((item, i) => {
    const start = (acc / total) * 360;
    acc += item.count;
    const end = (acc / total) * 360;
    const color = SLICE_TOKENS[i % SLICE_TOKENS.length];
    stops.push(`${color} ${start}deg ${end}deg`);
  });

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div
        className="w-32 h-32 rounded-full shrink-0"
        style={{ background: `conic-gradient(${stops.join(", ")})` }}
        role="img"
        aria-label={items.map((i) => `${i.label}: ${i.count} (${Math.round((i.count / total) * 100)}%)`).join(", ")}
      >
        <div className="w-full h-full rounded-full bg-background m-auto scale-[0.6] flex items-center justify-center">
          <span className="text-headline-sm text-on-background">{total}</span>
        </div>
      </div>
      {/* Legend doubles as the accessible/data-table fallback - the chart
          never carries information that isn't also here as plain text. */}
      <ul className="flex flex-col gap-1.5 text-body-md">
        {items.map((item, i) => (
          <li key={item.label} className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: SLICE_TOKENS[i % SLICE_TOKENS.length] }}
              aria-hidden
            />
            <span className="text-on-background">{item.label}</span>
            <span className="text-on-surface-variant">
              {item.count} ({Math.round((item.count / total) * 100)}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
