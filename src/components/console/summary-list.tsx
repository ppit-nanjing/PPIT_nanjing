// Dependency-free bar chart: a proportional fill behind each row reads
// instantly without pulling in a charting library (Recharts etc.) - the
// tallies rendered with this are simple enough that CSS does the job.
// Extracted from /console/reports so /console/sensus's analytics tab can
// reuse the exact same visual instead of a second implementation.
export function SummaryList({ items }: { items: { label: string; count: number }[] }) {
  if (items.length === 0) return <p className="text-body-md text-on-surface-variant">Belum ada data.</p>;
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <div key={item.label}>
          <div className="flex items-center justify-between text-body-md">
            <span className="text-on-background">{item.label}</span>
            <span className="text-on-surface-variant">{item.count}</span>
          </div>
          <div className="h-1.5 mt-1 rounded-full bg-primary-container/25" role="presentation">
            <div
              className="h-full rounded-full bg-primary-container"
              style={{ width: `${Math.max(4, Math.round((item.count / max) * 100))}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function tally(values: (string | null | undefined)[], emptyLabel = "Tidak diisi"): { label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const v of values) {
    const key = v?.trim() || emptyLabel;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
}
