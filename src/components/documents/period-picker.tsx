"use client";

type Props = {
  periods: { id: string; label: string }[];
  activePeriodId: string | null;
};

// Split out of console/documents/page.tsx: that page is a Server Component,
// and passing an onChange handler straight into a <select> rendered there
// throws "Event handlers cannot be passed to Client Component props." at
// request time - functions can't cross the server/client boundary. This
// tiny client component is the boundary instead.
export function PeriodPicker({ periods, activePeriodId }: Props) {
  return (
    <form method="get" className="flex items-end gap-2">
      <label className="flex flex-col gap-1.5">
        <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Periode</span>
        <select
          key={activePeriodId ?? "all"}
          name="period"
          defaultValue={activePeriodId ?? "all"}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className="bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-body-md"
        >
          <option value="all">Pilih periode…</option>
          {periods.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
    </form>
  );
}
