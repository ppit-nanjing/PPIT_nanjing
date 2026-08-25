"use client";

import { useMemo, useState, useTransition } from "react";
import { Bug, Palette, Lightbulb, MessageCircle, Copy, Check, MapPin, Mail } from "lucide-react";
import { updateFeedbackStatus } from "@/app/actions/feedback";

type Category = "bug" | "design" | "feature" | "general";
type Status = "new" | "in_review" | "resolved";

export interface FeedbackRow {
  id: string;
  category: Category;
  message: string;
  status: Status;
  userEmail: string | null;
  pagePath: string;
  elementSelector: string | null;
  elementDescription: string | null;
  createdAt: string;
}

const CATEGORY_META: Record<Category, { label: string; icon: typeof Bug }> = {
  bug: { label: "Bug", icon: Bug },
  design: { label: "Desain", icon: Palette },
  feature: { label: "Ide", icon: Lightbulb },
  general: { label: "Umum", icon: MessageCircle },
};

const STATUS_LABEL: Record<Status, string> = { new: "Baru", in_review: "Sedang Ditinjau", resolved: "Selesai" };

function formatEntry(f: FeedbackRow): string {
  return [
    `[${CATEGORY_META[f.category].label}] ${STATUS_LABEL[f.status]}`,
    `Tanggal: ${new Date(f.createdAt).toLocaleString("id-ID")}`,
    `Dari: ${f.userEmail ?? "Anonim"}`,
    `Halaman: ${f.pagePath}`,
    f.elementDescription ? `Elemen: ${f.elementDescription} (${f.elementSelector})` : null,
    `Pesan: ${f.message}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function FeedbackInbox({ initialRows }: { initialRows: FeedbackRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [categoryFilter, setCategoryFilter] = useState<Category | "all">("all");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) => (categoryFilter === "all" || r.category === categoryFilter) && (statusFilter === "all" || r.status === statusFilter)
      ),
    [rows, categoryFilter, statusFilter]
  );

  function copyAll() {
    navigator.clipboard.writeText(filtered.map(formatEntry).join("\n\n---\n\n"));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1500);
  }

  function copyOne(f: FeedbackRow) {
    navigator.clipboard.writeText(formatEntry(f));
    setCopiedId(f.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  function changeStatus(id: string, status: Status) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
    startTransition(() => updateFeedbackStatus(id, status));
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex flex-wrap gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as Category | "all")}
            className="bg-surface-container-low border border-outline-variant rounded-md px-3 py-2 text-body-md"
          >
            <option value="all">Semua Kategori</option>
            {Object.entries(CATEGORY_META).map(([key, m]) => (
              <option key={key} value={key}>
                {m.label}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as Status | "all")}
            className="bg-surface-container-low border border-outline-variant rounded-md px-3 py-2 text-body-md"
          >
            <option value="all">Semua Status</option>
            {Object.entries(STATUS_LABEL).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={copyAll}
          className="flex items-center gap-2 text-label-caps uppercase tracking-wide border border-outline-variant rounded-md px-4 py-2 hover:bg-surface-container-low transition-colors"
        >
          {copiedAll ? <Check size={14} /> : <Copy size={14} />} Salin Semua ({filtered.length})
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {filtered.length === 0 && (
          <p className="text-body-md text-on-surface-variant text-center py-12">Tidak ada masukan.</p>
        )}
        {filtered.map((f) => {
          const Icon = CATEGORY_META[f.category].icon;
          return (
            <div key={f.id} className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5">
               <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 text-label-caps uppercase tracking-wide bg-surface-container-low px-2.5 py-1 rounded-full">
                    <Icon size={13} /> {CATEGORY_META[f.category].label}
                  </span>
                  {f.status === "new" && (
                    <span className="text-label-caps uppercase tracking-wide bg-primary-container text-on-primary px-2.5 py-1 rounded-full">
                      Baru
                    </span>
                  )}
                  <span className="text-label-caps text-on-surface-variant">
                    {new Date(f.createdAt).toLocaleString("id-ID")}
                  </span>
                </div>
                <button onClick={() => copyOne(f)} className="text-secondary hover:text-on-background shrink-0" title="Salin detail masukan">
                  {copiedId === f.id ? <Check size={16} /> : <Copy size={16} />}
                </button>
                {f.userEmail && (
                  // mailto keeps this dependency-free; the snapshot email exists
                  // precisely so contact survives account deletion.
                  <a
                    href={`mailto:${encodeURIComponent(f.userEmail)}?subject=${encodeURIComponent(`Re: masukan ${CATEGORY_META[f.category].label} di ${f.pagePath}`)}`}
                    className="text-secondary hover:text-on-background shrink-0"
                    title={`Balas via email ke ${f.userEmail}`}
                  >
                    <Mail size={16} />
                  </a>
                )}
              </div>

              <p className="text-body-md text-on-background mb-3 whitespace-pre-wrap">{f.message}</p>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-label-caps text-on-surface-variant mb-4">
                <span>{f.userEmail ?? "Anonim"}</span>
                <span>&middot;</span>
                <span>{f.pagePath}</span>
                {f.elementDescription && (
                  <span className="flex items-center gap-1">
                    <MapPin size={12} /> {f.elementDescription}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {(["new", "in_review", "resolved"] as Status[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => changeStatus(f.id, s)}
                    className={`text-label-caps px-3 py-1.5 rounded-md border transition-colors ${
                      f.status === s
                        ? "bg-on-background text-inverse-on-surface border-on-background"
                        : "border-outline-variant text-on-surface-variant hover:bg-surface-container-low"
                    }`}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
