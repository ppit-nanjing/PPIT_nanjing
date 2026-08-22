"use client";

import { useActionState, useMemo } from "react";
import type { ShortLinkFormState } from "@/app/actions/short-links";

const CATEGORIES: { value: string; label: string }[] = [
  { value: "documentation", label: "Dokumentasi" },
  { value: "file", label: "Berkas" },
  { value: "form", label: "Formulir" },
  { value: "other", label: "Lainnya" },
];

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

export type ShortLinkInitial = {
  slug?: string;
  title?: string;
  targetUrl?: string;
  description?: string | null;
  category?: string;
  managementPeriodId?: string | null;
  expiresAt?: string | null;
  isActive?: boolean;
};

export function ShortLinkForm({
  action,
  periods,
  initial,
  submitLabel,
  showActive,
}: {
  action: (prev: ShortLinkFormState, formData: FormData) => Promise<ShortLinkFormState>;
  periods: { id: string; label: string }[];
  initial?: ShortLinkInitial;
  submitLabel: string;
  showActive?: boolean;
}) {
  const [state, formAction] = useActionState<ShortLinkFormState, FormData>(action, {});

  const previewSlug = useMemo(() => {
    const raw = initial?.slug ?? "";
    return raw || slugify(initial?.title ?? "");
  }, [initial?.slug, initial?.title]);

  return (
    <form action={formAction} className="flex flex-col gap-5 max-w-2xl">
      {state.error && (
        <p className="bg-error-container/40 text-on-error-container text-body-md px-4 py-3 rounded-lg">
          {state.error}
        </p>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Judul</span>
        <input
          name="title"
          required
          defaultValue={initial?.title ?? ""}
          placeholder="mis. Dokumentasi AD/ART 2025/2026"
          className="bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2.5 text-body-md outline-none focus:border-primary"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">URL tujuan</span>
        <input
          name="targetUrl"
          required
          type="url"
          defaultValue={initial?.targetUrl ?? ""}
          placeholder="https://drive.google.com/..."
          className="bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2.5 text-body-md outline-none focus:border-primary"
        />
        <span className="text-label-caps text-on-surface-variant/80">
          Tujuan penerusan (Google Drive, Vercel Blob, dll). Catatan: Drive diblokir di Tiongkok.
        </span>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">
          Slug <span className="text-on-surface-variant/70">(opsional, otomatis dari judul)</span>
        </span>
        <input
          name="slug"
          defaultValue={initial?.slug ?? ""}
          placeholder={previewSlug || "dokumentasi-ad-art"}
          className="bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2.5 text-body-md outline-none focus:border-primary"
        />
        <span className="text-label-caps text-on-surface-variant/80">
          Tautan publik: <code className="text-on-background">nanjing.ppitiongkok.com/l/{previewSlug || "…"}</code>
        </span>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Kategori</span>
        <select
          name="category"
          defaultValue={initial?.category ?? "other"}
          className="bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2.5 text-body-md outline-none focus:border-primary"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Periode kepengurusan</span>
          <select
            name="managementPeriodId"
            defaultValue={initial?.managementPeriodId ?? "none"}
            className="bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2.5 text-body-md outline-none focus:border-primary"
          >
            <option value="none">— Tanpa periode —</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Periode baru (opsional)</span>
          <input
            name="newPeriod"
            placeholder="isi untuk buat periode baru"
            className="bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2.5 text-body-md outline-none focus:border-primary"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">
          Kedaluwarsa <span className="text-on-surface-variant/70">(opsional)</span>
        </span>
        <input
          name="expiresAt"
          type="datetime-local"
          defaultValue={initial?.expiresAt ?? ""}
          className="bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2.5 text-body-md outline-none focus:border-primary"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">
          Deskripsi <span className="text-on-surface-variant/70">(opsional)</span>
        </span>
        <textarea
          name="description"
          rows={3}
          defaultValue={initial?.description ?? ""}
          className="bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2.5 text-body-md outline-none focus:border-primary resize-y"
        />
      </label>

      {showActive && (
        <label className="flex items-center gap-2.5">
          <input type="checkbox" name="isActive" defaultChecked={initial?.isActive ?? true} className="w-4 h-4" />
          <span className="text-body-md text-on-background">Tautan aktif (bisa dibuka publik)</span>
        </label>
      )}

      <button
        type="submit"
        className="self-start bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-lg hover:opacity-90 transition-colors"
      >
        {submitLabel}
      </button>
    </form>
  );
}
