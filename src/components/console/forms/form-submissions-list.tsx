"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { FormField } from "@/db/schema";
import { deleteFormSubmission, setSubmissionReviewed } from "@/app/actions/forms";
import { ConfirmButton } from "@/components/console/confirm-button";
import { SubmitButton } from "@/components/console/submit-button";
import { SubmissionNoteForm } from "@/components/console/forms/submission-note-form";

export type SubmissionListItem = {
  id: string;
  createdAt: string;
  reviewed: boolean;
  internalNote: string | null;
  submitterName: string | null;
  submitterEmail: string | null;
  answers: Record<string, string | number | string[]>;
};

const INTL_ID = "id-ID";

function answerText(field: FormField, value: string | number | string[] | undefined): string {
  if (value == null) return "";
  if (field.type === "multiselect") {
    return Array.isArray(value) ? value.join(", ") : String(value);
  }
  if (field.type === "scale") {
    return `${value}/${field.scaleMax ?? 5}`;
  }
  return String(value);
}

export function FormSubmissionsList({
  fields,
  submissions,
}: {
  fields: FormField[];
  submissions: SubmissionListItem[];
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "unreviewed" | "reviewed">("all");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");

  const fieldById = useMemo(() => new Map(fields.map((f) => [f.id, f])), [fields]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = submissions.filter((s) => {
      if (status === "unreviewed" && s.reviewed) return false;
      if (status === "reviewed" && !s.reviewed) return false;
      if (!q) return true;
      const haystack = [
        s.submitterName ?? "",
        s.submitterEmail ?? "",
        s.internalNote ?? "",
        ...Object.entries(s.answers).map(([k, v]) => {
          const label = fieldById.get(k)?.label ?? k;
          return `${label} ${Array.isArray(v) ? v.join(" ") : String(v)}`;
        }),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
    rows = [...rows].sort((a, b) =>
      sort === "newest"
        ? b.createdAt.localeCompare(a.createdAt)
        : a.createdAt.localeCompare(b.createdAt),
    );
    return rows;
  }, [submissions, query, status, sort, fieldById]);

  const unreviewedCount = submissions.filter((s) => !s.reviewed).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5 flex-1 min-w-[220px]">
          <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Cari jawaban</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="nama, email, isi jawaban…"
            className="bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2.5 text-body-md outline-none focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className="bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2.5 text-body-md outline-none focus:border-primary"
            aria-label="Filter status review"
          >
            <option value="all">Semua ({submissions.length})</option>
            <option value="unreviewed">Belum direview ({unreviewedCount})</option>
            <option value="reviewed">Sudah direview ({submissions.length - unreviewedCount})</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Urutan</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2.5 text-body-md outline-none focus:border-primary"
            aria-label="Urutan jawaban"
          >
            <option value="newest">Terbaru</option>
            <option value="oldest">Terlama</option>
          </select>
        </label>
      </div>

      {visible.length === 0 ? (
        <p className="text-body-md text-on-surface-variant">
          {submissions.length === 0 ? "Belum ada jawaban." : "Tidak ada jawaban yang cocok dengan filter."}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((s) => {
            const firstText = fields
              .filter((f) => f.type !== "file")
              .map((f) => answerText(f, s.answers[f.id]))
              .find((v) => v.length > 0);
            const title = s.submitterName || firstText || "Jawaban tanpa nama";
            return (
              <details key={s.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl">
                <summary className="cursor-pointer flex items-center gap-3 px-4 py-3 flex-wrap">
                  <ChevronDown size={16} className="text-on-surface-variant shrink-0" aria-hidden="true" />
                  <span className="text-body-md text-on-background font-medium flex-1 min-w-[180px] break-all">{title}</span>
                  <span className="text-label-caps text-on-surface-variant">
                    {new Date(s.createdAt).toLocaleString(INTL_ID, { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                  {s.reviewed ? (
                    <span className="px-2.5 py-1 rounded-full text-label-caps bg-primary-container/40 text-on-primary-container">Sudah direview</span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-label-caps bg-outline-variant/40 text-on-surface-variant">Belum direview</span>
                  )}
                  {s.internalNote && (
                    <span className="px-2.5 py-1 rounded-full text-label-caps bg-tertiary-container/40 text-on-tertiary-container">Ada catatan</span>
                  )}
                </summary>
                <div className="border-t border-outline-variant px-4 py-4 flex flex-col gap-4">
                  <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                    {fields.map((f) => {
                      const value = s.answers[f.id];
                      const text = answerText(f, value);
                      if (!text && f.type !== "file") return null;
                      return (
                        <div key={f.id} className="flex flex-col gap-0.5">
                          <dt className="text-label-caps uppercase tracking-wide text-on-surface-variant">{f.label}</dt>
                          <dd className="text-body-md text-on-background break-all">
                            {f.type === "file" && typeof value === "string" && value ? (
                              <a href={value} target="_blank" rel="noopener noreferrer" className="text-primary-container underline">
                                Lihat berkas
                              </a>
                            ) : (
                              text || <span className="text-on-surface-variant">(kosong)</span>
                            )}
                          </dd>
                        </div>
                      );
                    })}
                    {(s.submitterName || s.submitterEmail) && (
                      <div className="flex flex-col gap-0.5">
                        <dt className="text-label-caps uppercase tracking-wide text-on-surface-variant">Akun pengisi</dt>
                        <dd className="text-body-md text-on-background">
                          {s.submitterName}
                          {s.submitterEmail ? ` (${s.submitterEmail})` : ""}
                        </dd>
                      </div>
                    )}
                  </dl>

                  <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-outline-variant/60">
                    <form action={setSubmissionReviewed}>
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="reviewed" value={s.reviewed ? "false" : "true"} />
                      <SubmitButton
                        successMessage={s.reviewed ? "Ditandai belum direview." : "Ditandai sudah direview."}
                        className="text-label-caps uppercase tracking-wide text-primary-container hover:text-primary transition-colors"
                      >
                        {s.reviewed ? "Tandai belum direview" : "Tandai sudah direview"}
                      </SubmitButton>
                    </form>
                    <ConfirmButton
                      action={deleteFormSubmission}
                      payload={{ id: s.id }}
                      message="Hapus jawaban ini secara permanen?"
                    >
                      Hapus
                    </ConfirmButton>
                  </div>

                  <SubmissionNoteForm submissionId={s.id} initialNote={s.internalNote} />
                </div>
              </details>
            );
          })}
        </div>
      )}

      <p className="text-label-caps text-on-surface-variant">
        {visible.length} dari {submissions.length} jawaban tampil
      </p>
    </div>
  );
}
