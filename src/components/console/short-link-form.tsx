"use client";

import { useActionState, useMemo } from "react";
import type { ShortLinkFormState } from "@/app/actions/short-links";
import { Select, ToggleSwitch, fieldInput } from "@/components/console/form";

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
          className={fieldInput}
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
          className={fieldInput}
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
          className={fieldInput}
        />
        <span className="text-label-caps text-on-surface-variant/80">
          Tautan publik: <code className="text-on-background">nanjing.ppitiongkok.com/l/{previewSlug || "…"}</code>
          {initial?.slug && " — mengganti slug memutus tautan lama yang sudah dibagikan."}
        </span>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Kategori</span>
        <Select name="category" defaultValue={initial?.category ?? "other"} options={CATEGORIES} className="w-full" />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Periode kepengurusan</span>
          <Select name="managementPeriodId" defaultValue={initial?.managementPeriodId ?? "none"} className="w-full">
            <option value="none">— Tanpa periode —</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Periode baru (opsional)</span>
          <input
            name="newPeriod"
            placeholder="isi untuk buat periode baru"
            className={fieldInput}
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
          className={fieldInput}
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
          className={`${fieldInput} resize-y`}
        />
      </label>

      {showActive && (
        <ToggleSwitch name="isActive" defaultChecked={initial?.isActive ?? true} label="Tautan aktif (bisa dibuka publik)" />
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
