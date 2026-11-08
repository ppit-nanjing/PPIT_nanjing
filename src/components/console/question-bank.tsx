"use client";

import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { QUESTION_BANK, FIELD_TYPE_LABELS, type MembershipFieldType, type QuestionTemplate } from "@/lib/membership-form";
import { SubmitButton } from "@/components/console/submit-button";

// `action` dikirim sebagai prop supaya bank pertanyaan yang sama dipakai modul
// Pendaftaran Anggota dan modul Formulir (masing-masing punya Server Action
// sendiri yang mengecek hak aksesnya). `hiddenFields` mengisi field tambahan
// yang dibutuhkan action tujuan (mis. formId di modul Formulir).
export function QuestionBank({
  action,
  hiddenFields,
  excludeTypes = [],
}: {
  action: (formData: FormData) => void | Promise<void>;
  hiddenFields?: Record<string, string>;
  /** Template berjenis ini tidak ditampilkan (formulir tidak mendukung unggahan). */
  excludeTypes?: MembershipFieldType[];
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const allowed = QUESTION_BANK.map((c) => ({
    ...c,
    templates: c.templates.filter((t) => !excludeTypes.includes(t.type)),
  })).filter((c) => c.templates.length > 0);
  const categories = q
    ? allowed
        .map((c) => ({
          ...c,
          templates: c.templates.filter(
            (t) => t.label.toLowerCase().includes(q) || t.type.toLowerCase().includes(q)
          ),
        }))
        .filter((c) => c.templates.length > 0)
    : allowed;

  // Card chrome + heading come from the CollapsibleSection this sits inside.
  // Container query (@container), bukan breakpoint layar: bank ini dipakai di
  // halaman selebar berbeda (Pendaftaran Anggota, kelola Formulir), jadi jumlah
  // kolom mengikuti lebar panel tempatnya, bukan lebar jendela.
  return (
    <div className="@container">
      <div className="flex items-center gap-2 bg-soft-gray rounded-md px-3 mb-5">
        <Search size={16} className="text-on-surface-variant" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari pertanyaan (mis. divisi, motivasi, skill)…"
          className="bg-transparent flex-1 py-2.5 text-body-md focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-1 @2xl:grid-cols-2 @5xl:grid-cols-3 gap-x-6 gap-y-6">
        {categories.map((cat) => (
          <div key={cat.title} className="min-w-0">
            <h3 className="text-label-caps uppercase tracking-wide text-primary-container mb-2">
              {cat.title} <span className="text-on-surface-variant">· {cat.templates.length}</span>
            </h3>
            <ul className="flex flex-col gap-2">
              {cat.templates.map((t) => (
                <li key={t.key}>
                  <AddTemplateButton template={t} action={action} hiddenFields={hiddenFields} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function AddTemplateButton({
  template,
  action,
  hiddenFields,
}: {
  template: QuestionTemplate;
  action: (formData: FormData) => void | Promise<void>;
  hiddenFields?: Record<string, string>;
}) {
  return (
    <form action={action} className="flex items-start justify-between gap-3 bg-soft-gray rounded-md px-4 py-3 h-full">
      {hiddenFields &&
        Object.entries(hiddenFields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
      {/* Label dibiarkan membungkus (bukan truncate): pertanyaan komitmen &
          keahlian panjang dan harus terbaca utuh sebelum ditambahkan. */}
      <div className="min-w-0 flex-1">
        <p className="text-body-md text-on-background leading-snug text-pretty break-words">{template.label}</p>
        <p className="text-label-caps text-on-surface-variant mt-1">{FIELD_TYPE_LABELS[template.type]}</p>
      </div>
      <SubmitButton
        successMessage="Pertanyaan ditambahkan."
        aria-label={`Tambah ${template.label}`}
        className="shrink-0 inline-flex items-center gap-1 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-3 py-2 rounded-md hover:bg-primary transition-colors disabled:opacity-60"
      >
        <Plus size={14} /> Tambah
      </SubmitButton>
      <input type="hidden" name="templateKey" value={template.key} />
    </form>
  );
}
