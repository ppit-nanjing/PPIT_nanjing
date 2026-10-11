import Link from "next/link";
import { FORM_KIND_LABEL, type FormKind } from "@/lib/form-types";

export type FormListRow = {
  id: string;
  title: string;
  kind: FormKind;
  eventTitle: string | null;
  isOpen: boolean;
  applicants: number;
};

// Daftar form per tab. Baris diklik menuju halaman kelola form.
export function FormList({ rows, emptyText }: { rows: FormListRow[]; emptyText: string }) {
  if (rows.length === 0) {
    return (
      <p className="text-body-md text-on-surface-variant rounded-lg bg-surface-container-low px-4 py-3">{emptyText}</p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map((r) => (
        <Link
          key={r.id}
          href={`/console/forms/${r.id}`}
          className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between bg-surface-container-lowest border border-outline-variant rounded-lg px-5 py-3 hover:bg-surface-container-low transition-colors"
        >
          <span className="min-w-0">
            <span className="block text-body-md text-on-background truncate">{r.title}</span>
            <span className="block text-body-sm text-on-surface-variant truncate">
              {FORM_KIND_LABEL[r.kind]}
              {r.eventTitle ? ` · ${r.eventTitle}` : ""} &middot; {r.applicants} pendaftar
            </span>
          </span>
          <span
            className={`shrink-0 text-label-caps uppercase tracking-wide px-2 py-1 rounded ${
              r.isOpen
                ? "bg-primary-container/15 text-primary-container"
                : "bg-surface-container-low text-on-surface-variant"
            }`}
          >
            {r.isOpen ? "Dibuka" : "Tutup"}
          </span>
        </Link>
      ))}
    </div>
  );
}
