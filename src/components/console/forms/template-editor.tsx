"use client";

import { useActionState, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { FormField, FormSection } from "@/db/schema";
import { updateFormTemplate, type FormTemplateEditState } from "@/app/actions/forms";
import { SubmitButton, useActionToast } from "@/components/console/submit-button";

const INPUT =
  "w-full rounded-md border border-outline-variant bg-surface-container-low px-3 py-2 text-body-md text-on-background focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const LABEL = "text-label-caps uppercase tracking-wide text-on-surface-variant";
const BTN_SECONDARY =
  "inline-flex items-center gap-1.5 rounded-md border border-outline-variant px-3 py-2 text-label-caps uppercase tracking-wide text-on-background hover:bg-surface-container-low transition-colors disabled:opacity-60";

const FIELD_TYPE_OPTIONS: { value: FormField["type"]; label: string }[] = [
  { value: "short_text", label: "Teks pendek" },
  { value: "paragraph", label: "Paragraf" },
  { value: "email", label: "Email" },
  { value: "tel", label: "Nomor telepon" },
  { value: "number", label: "Angka" },
  { value: "date", label: "Tanggal" },
  { value: "select", label: "Dropdown" },
  { value: "radio", label: "Pilihan tunggal" },
  { value: "multiselect", label: "Kotak centang (pilih banyak)" },
  { value: "scale", label: "Skala (1–5)" },
  { value: "file", label: "Unggah berkas" },
];

const HAS_OPTIONS: FormField["type"][] = ["select", "radio", "multiselect"];

function slugifyId(label: string, taken: Set<string>): string {
  const base =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 50) || "field";
  let id = base;
  let n = 2;
  while (taken.has(id)) {
    id = `${base}-${n}`;
    n += 1;
  }
  return id;
}

export function TemplateEditor({
  template,
}: {
  template: {
    id: string;
    title: string;
    description: string | null;
    successMessage: string | null;
    notifyEmail: string | null;
    status: string;
    sections: FormSection[];
  };
}) {
  const [state, formAction, isPending] = useActionState<FormTemplateEditState, FormData>(updateFormTemplate, {});
  useActionToast(isPending, state.error, "Template disimpan.");
  const [sections, setSections] = useState<FormSection[]>(template.sections);

  function patchSection(index: number, patch: Partial<FormSection>) {
    setSections((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function patchField(sectionIndex: number, fieldIndex: number, patch: Partial<FormField>) {
    setSections((prev) =>
      prev.map((s, i) =>
        i === sectionIndex
          ? { ...s, fields: s.fields.map((f, j) => (j === fieldIndex ? { ...f, ...patch } : f)) }
          : s,
      ),
    );
  }

  function move<T>(arr: T[], from: number, to: number): T[] {
    if (to < 0 || to >= arr.length) return arr;
    const copy = [...arr];
    const [item] = copy.splice(from, 1);
    copy.splice(to, 0, item);
    return copy;
  }

  function addSection() {
    setSections((prev) => [
      ...prev,
      { id: `s${prev.length + 1}`, title: "Bagian baru", fields: [] },
    ]);
  }

  function addField(sectionIndex: number) {
    setSections((prev) => {
      const taken = new Set(prev.flatMap((s) => s.fields.map((f) => f.id)));
      return prev.map((s, i) =>
        i === sectionIndex
          ? {
              ...s,
              fields: [
                ...s.fields,
                {
                  id: slugifyId("pertanyaan-baru", taken),
                  type: "short_text",
                  label: "Pertanyaan baru",
                  required: false,
                },
              ],
            }
          : s,
      );
    });
  }

  function changeType(sectionIndex: number, fieldIndex: number, type: FormField["type"]) {
    setSections((prev) =>
      prev.map((s, i) =>
        i === sectionIndex
          ? {
              ...s,
              fields: s.fields.map((f, j) => {
                if (j !== fieldIndex) return f;
                const next: FormField = { ...f, type };
                if (HAS_OPTIONS.includes(type) && (!next.options || next.options.length === 0)) {
                  next.options = ["Opsi 1", "Opsi 2"];
                }
                if (type === "scale" && !next.scaleMax) next.scaleMax = 5;
                return next;
              }),
            }
          : s,
      ),
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="id" value={template.id} />
      <input type="hidden" name="sections" value={JSON.stringify(sections)} />

      <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 flex flex-col gap-4">
        <h2 className="text-headline-sm text-on-background">Setelan</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Judul</span>
            <input name="title" defaultValue={template.title} required maxLength={200} className={INPUT} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Status</span>
            <select name="status" defaultValue={template.status} className={INPUT}>
              <option value="draft">Draft (belum bisa diisi)</option>
              <option value="published">Terbit (publik bisa mengisi)</option>
              <option value="closed">Ditutup</option>
            </select>
          </label>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>Deskripsi pembuka</span>
          <textarea name="description" defaultValue={template.description ?? ""} maxLength={1000} rows={2} className={INPUT} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>Pesan setelah kirim</span>
          <textarea name="successMessage" defaultValue={template.successMessage ?? ""} maxLength={1000} rows={2} className={INPUT} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>Email notifikasi jawaban baru (opsional)</span>
          <input name="notifyEmail" type="email" defaultValue={template.notifyEmail ?? ""} className={INPUT} />
        </label>
      </section>

      <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 flex flex-col gap-4">
        <h2 className="text-headline-sm text-on-background">Pertanyaan</h2>
        {sections.map((section, si) => (
          <div key={si} className="border border-outline-variant rounded-lg p-4 flex flex-col gap-3">
            <div className="flex items-end gap-2">
              <label className="flex flex-col gap-1.5 flex-1">
                <span className={LABEL}>Judul bagian</span>
                <input
                  value={section.title}
                  onChange={(e) => patchSection(si, { title: e.target.value })}
                  maxLength={120}
                  className={INPUT}
                />
              </label>
              <div className="flex gap-1.5 pb-1">
                <button type="button" aria-label="Naikkan bagian" onClick={() => setSections((prev) => move(prev, si, si - 1))} className="p-2 rounded-md text-on-surface-variant hover:bg-surface-container-low">
                  <ArrowUp size={16} />
                </button>
                <button type="button" aria-label="Turunkan bagian" onClick={() => setSections((prev) => move(prev, si, si + 1))} className="p-2 rounded-md text-on-surface-variant hover:bg-surface-container-low">
                  <ArrowDown size={16} />
                </button>
                <button type="button" aria-label="Hapus bagian" onClick={() => setSections((prev) => prev.filter((_, i) => i !== si))} className="p-2 rounded-md text-error hover:bg-error-container/30">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className={LABEL}>Deskripsi bagian (opsional)</span>
              <input
                value={section.description ?? ""}
                onChange={(e) => patchSection(si, { description: e.target.value || undefined })}
                maxLength={500}
                className={INPUT}
              />
            </label>

            <div className="flex flex-col gap-3">
              {section.fields.map((f, fi) => (
                <div key={fi} className="border border-outline-variant/60 rounded-lg p-3 flex flex-col gap-3 bg-surface-container-low/40">
                  <div className="flex items-end gap-2">
                    <label className="flex flex-col gap-1.5 w-36 shrink-0">
                      <span className={LABEL}>ID</span>
                      <input
                        value={f.id}
                        onChange={(e) => patchField(si, fi, { id: e.target.value })}
                        pattern="[a-z0-9][a-z0-9-]{0,60}"
                        title="huruf kecil, angka, tanda hubung"
                        className={INPUT}
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 w-48 shrink-0">
                      <span className={LABEL}>Tipe</span>
                      <select value={f.type} onChange={(e) => changeType(si, fi, e.target.value as FormField["type"])} className={INPUT}>
                        {FIELD_TYPE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
                      <span className={LABEL}>Label pertanyaan</span>
                      <input value={f.label} onChange={(e) => patchField(si, fi, { label: e.target.value })} maxLength={200} className={INPUT} />
                    </label>
                    <div className="flex gap-1.5 pb-1">
                      <button type="button" aria-label="Naikkan pertanyaan" onClick={() => patchSection(si, { fields: move(section.fields, fi, fi - 1) })} className="p-2 rounded-md text-on-surface-variant hover:bg-surface-container-low">
                        <ArrowUp size={16} />
                      </button>
                      <button type="button" aria-label="Turunkan pertanyaan" onClick={() => patchSection(si, { fields: move(section.fields, fi, fi + 1) })} className="p-2 rounded-md text-on-surface-variant hover:bg-surface-container-low">
                        <ArrowDown size={16} />
                      </button>
                      <button type="button" aria-label="Hapus pertanyaan" onClick={() => patchSection(si, { fields: section.fields.filter((_, j) => j !== fi) })} className="p-2 rounded-md text-error hover:bg-error-container/30">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="flex flex-col gap-1.5">
                      <span className={LABEL}>Keterangan bantu (opsional)</span>
                      <input
                        value={f.description ?? ""}
                        onChange={(e) => patchField(si, fi, { description: e.target.value || undefined })}
                        maxLength={500}
                        className={INPUT}
                      />
                    </label>
                    {!HAS_OPTIONS.includes(f.type) && f.type !== "scale" && (
                      <label className="flex flex-col gap-1.5">
                        <span className={LABEL}>Placeholder (opsional)</span>
                        <input
                          value={f.placeholder ?? ""}
                          onChange={(e) => patchField(si, fi, { placeholder: e.target.value || undefined })}
                          maxLength={200}
                          className={INPUT}
                        />
                      </label>
                    )}
                    {HAS_OPTIONS.includes(f.type) && (
                      <label className="flex flex-col gap-1.5">
                        <span className={LABEL}>Pilihan (satu per baris)</span>
                        <textarea
                          value={(f.options ?? []).join("\n")}
                          onChange={(e) =>
                            patchField(si, fi, {
                              options: e.target.value.split("\n").map((o) => o.trim()).filter(Boolean),
                            })
                          }
                          rows={3}
                          className={INPUT}
                        />
                      </label>
                    )}
                    {f.type === "scale" && (
                      <>
                        <label className="flex flex-col gap-1.5">
                          <span className={LABEL}>Nilai maksimum skala</span>
                          <input
                            type="number"
                            min={2}
                            max={10}
                            value={f.scaleMax ?? 5}
                            onChange={(e) => {
                              const parsed = Number.parseInt(e.target.value, 10);
                              patchField(si, fi, { scaleMax: Number.isInteger(parsed) ? parsed : undefined });
                            }}
                            className={INPUT}
                          />
                        </label>
                        <label className="flex flex-col gap-1.5">
                          <span className={LABEL}>Label kiri (nilai kecil)</span>
                          <input
                            value={f.lowLabel ?? ""}
                            onChange={(e) => patchField(si, fi, { lowLabel: e.target.value || undefined })}
                            maxLength={40}
                            className={INPUT}
                          />
                        </label>
                        <label className="flex flex-col gap-1.5">
                          <span className={LABEL}>Label kanan (nilai besar)</span>
                          <input
                            value={f.highLabel ?? ""}
                            onChange={(e) => patchField(si, fi, { highLabel: e.target.value || undefined })}
                            maxLength={40}
                            className={INPUT}
                          />
                        </label>
                      </>
                    )}
                    <label className="flex items-center gap-2.5 text-body-md text-on-background sm:col-span-2">
                      <input
                        type="checkbox"
                        checked={f.required}
                        onChange={(e) => patchField(si, fi, { required: e.target.checked })}
                        className="h-4 w-4 accent-primary-container"
                      />
                      Wajib diisi
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <button type="button" onClick={() => addField(si)} className={`${BTN_SECONDARY} self-start`}>
              <Plus size={16} /> Tambah pertanyaan
            </button>
          </div>
        ))}
        <button type="button" onClick={addSection} className={`${BTN_SECONDARY} self-start`}>
          <Plus size={16} /> Tambah bagian
        </button>
      </section>

      <div className="flex items-center gap-3">
        <SubmitButton
          successMessage=""
          pendingLabel="Menyimpan…"
          className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-lg hover:opacity-90 transition-colors disabled:opacity-60"
        >
          Simpan Perubahan
        </SubmitButton>
        {state.ok && <span className="text-body-sm text-on-surface-variant">Perubahan tersimpan.</span>}
      </div>
    </form>
  );
}
