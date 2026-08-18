"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { ChevronDown, ChevronRight, GripVertical, MoreVertical, Copy } from "lucide-react";
import type { MembershipFieldDef } from "@/lib/membership-form";
import { OPTION_TYPES, SCALE_TYPES, GRID_TYPES, FIELD_TYPE_LABELS, isSectionType } from "@/lib/membership-form";
import { updateFormField, deleteFormField, moveFormField, duplicateFormField } from "@/app/actions/membership";

const ALL_TYPES: MembershipFieldDef["type"][] = [
  "text", "textarea", "email", "tel", "number", "select", "radio", "multiselect", "date", "checkbox", "rating", "image", "url", "section", "time", "linear_scale", "grid_radio", "grid_checkbox",
];

const TEXT_LIKE: MembershipFieldDef["type"][] = ["text", "textarea", "email", "tel", "url"];

type FieldConfig = {
  min?: number;
  max?: number;
  lowLabel?: string;
  highLabel?: string;
  rows?: string[];
  validations?: { min?: number; max?: number; minLength?: number };
};

// Module-level drag state (single drag at a time in this list).
let dragSourceId: string | null = null;
let dragSourceIndex = -1;

function summary(f: MembershipFieldDef): string {
  if (isSectionType(f.type)) return "Bagian / judul tahap";
  const parts: string[] = [];
  if (f.required) parts.push("Wajib");
  if (OPTION_TYPES.includes(f.type)) parts.push(`${f.options?.length ?? 0} pilihan`);
  if (SCALE_TYPES.includes(f.type)) parts.push(`Skala ${f.config?.min ?? 1}–${f.config?.max ?? 5}`);
  if (f.helpText) parts.push("Ada keterangan");
  return parts.join(" · ");
}

export function FormFieldEditor({ field, index, sectionLabel }: { field: MembershipFieldDef; index: number; sectionLabel?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<MembershipFieldDef["type"]>(field.type);
  const [optionsText, setOptionsText] = useState((field.options ?? []).join("\n"));
  const [rowsText, setRowsText] = useState((field.config?.rows ?? []).join("\n"));
  const [cfg, setCfg] = useState<FieldConfig>(field.config ?? {});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dragEnabled, setDragEnabled] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dropBefore, setDropBefore] = useState<null | boolean>(null);

  const isSection = isSectionType(type);
  const showOptions = OPTION_TYPES.includes(type) || GRID_TYPES.includes(type);
  const showGrid = GRID_TYPES.includes(type);
  const showRating = SCALE_TYPES.includes(type);
  const configStr = JSON.stringify(cfg) || "";

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const before = dropBefore ?? true;
    const from = dragSourceIndex;
    const sourceId = dragSourceId;
    setDragEnabled(false);
    setDragging(false);
    setDropBefore(null);
    dragSourceId = null;
    dragSourceIndex = -1;
    if (!sourceId || from < 0) return;
    let to = before ? index : index + 1;
    if (from < to) to -= 1;
    await moveFormField(sourceId, to);
    router.refresh();
  }

  return (
    <div
      draggable={dragEnabled}
      onDragStart={(e) => {
        dragSourceId = field.id ?? "";
        dragSourceIndex = index;
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", field.id ?? "");
        setDragging(true);
      }}
      onDragEnd={() => {
        setDragEnabled(false);
        setDragging(false);
        setDropBefore(null);
        dragSourceId = null;
        dragSourceIndex = -1;
      }}
      onDragOver={(e) => {
        if (!dragSourceId || dragSourceId === field.id) return;
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        setDropBefore(e.clientY < rect.top + rect.height / 2);
      }}
      onDragLeave={() => setDropBefore(null)}
      onDrop={handleDrop}
      className={`relative rounded-xl border ${dragging ? "opacity-50" : ""} ${
        dropBefore !== null ? "border-primary-container" : "border-outline-variant"
      } ${isSection ? "bg-secondary-container/20" : "bg-surface-container-lowest"}`}
    >
      {dropBefore !== null && (
        <div className={`absolute left-0 right-0 h-1 bg-primary-container rounded ${dropBefore ? "-top-1.5" : "-bottom-1.5"}`} />
      )}
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          aria-label="Seret untuk mengubah urutan"
          onMouseDown={() => setDragEnabled(true)}
          onMouseUp={() => setDragEnabled(false)}
          className="text-on-surface-variant/60 hover:text-on-surface-variant cursor-grab active:cursor-grabbing p-1"
        >
          <GripVertical size={18} />
        </button>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex-1 flex items-center gap-2 text-left min-w-0"
        >
          {open ? <ChevronDown size={16} className="text-on-surface-variant shrink-0" /> : <ChevronRight size={16} className="text-on-surface-variant shrink-0" />}
          <span className="text-label-caps text-on-surface-variant w-6 shrink-0">{index + 1}.</span>
          <div className="flex-1 min-w-0">
            <p className="text-body-md font-medium text-on-background truncate">{field.label || "(tanpa judul)"}</p>
            <p className="text-label-caps text-on-surface-variant truncate">
              {FIELD_TYPE_LABELS[field.type]}
              {summary(field) ? ` · ${summary(field)}` : ""}
              {sectionLabel ? ` · ${sectionLabel}` : ""}
            </p>
          </div>
        </button>
        <div className="relative">
          <button
            type="button"
            aria-label="Lainnya"
            onClick={() => setMenuOpen((m) => !m)}
            className="text-on-surface-variant hover:text-on-background p-1 rounded-full hover:bg-soft-gray"
          >
            <MoreVertical size={18} />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 z-20 mt-1 w-52 bg-surface-container rounded-lg shadow-lg border border-outline-variant py-1">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setOpen(true);
                    setShowAdvanced(true);
                  }}
                  className="block w-full text-left px-4 py-2 text-body-md text-on-background hover:bg-soft-gray"
                >
                  Tambah deskripsi
                </button>
                {!field.isCore && (
                  <button
                    type="button"
                    onClick={async () => {
                      setMenuOpen(false);
                      await duplicateFormField(field.id ?? "");
                      router.refresh();
                    }}
                    className="flex items-center gap-2 w-full text-left px-4 py-2 text-body-md text-on-background hover:bg-soft-gray"
                  >
                    <Copy size={14} /> Salin pertanyaan
                  </button>
                )}
                {!field.isCore && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setConfirmDelete(true);
                    }}
                    className="block w-full text-left px-4 py-2 text-body-md text-error hover:bg-error-container/30"
                  >
                    Hapus
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-outline-variant">
          <form action={updateFormField} className="flex flex-col gap-4 mt-4">
            <input type="hidden" name="id" value={field.id ?? ""} />
            <input type="hidden" name="config" value={configStr} />
            <div className="flex flex-col gap-2">
              <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">
                {isSection ? "Judul Bagian" : "Pertanyaan"}
              </span>
              <input name="label" defaultValue={field.label} className="bg-soft-gray rounded-md p-3 text-body-md" />
            </div>

            {!isSection && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Jenis Jawaban</span>
                    <select
                      name="type"
                      value={type}
                      onChange={(e) => setType(e.target.value as MembershipFieldDef["type"])}
                      className="bg-soft-gray rounded-md p-3 text-body-md"
                    >
                      {ALL_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {FIELD_TYPE_LABELS[t]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-body-md text-on-background self-end pb-3">
                    <input type="checkbox" name="required" defaultChecked={field.required} />
                    Wajib diisi
                  </label>
                </div>

                {showOptions && (
                  <div className="flex flex-col gap-2">
                    <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">
                      {showGrid
                        ? "Kolom (satu per baris — pilihan untuk tiap baris)"
                        : `Daftar Pilihan (satu per baris${type === "multiselect" ? " — bisa pilih lebih dari satu" : ""})`}
                    </span>
                    <textarea
                      name="options"
                      rows={4}
                      value={optionsText}
                      onChange={(e) => setOptionsText(e.target.value)}
                      className="bg-soft-gray rounded-md p-3 text-body-md resize-none"
                    />
                  </div>
                )}

                {showGrid && (
                  <div className="flex flex-col gap-2">
                    <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">
                      Baris (satu per baris — pertanyaan/pernyataan di kiri)
                    </span>
                    <textarea
                      rows={4}
                      value={rowsText}
                      onChange={(e) => {
                        setRowsText(e.target.value);
                        setCfg((c) => ({ ...c, rows: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) }));
                      }}
                      className="bg-soft-gray rounded-md p-3 text-body-md resize-none"
                    />
                  </div>
                )}

                {showRating && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-soft-gray rounded-md p-3">
                    <label className="flex flex-col gap-1 text-label-caps uppercase tracking-wide text-on-surface-variant">
                      Skala Terendah
                      <input type="number" defaultValue={cfg.min ?? 1} onChange={(e) => setCfg((c) => ({ ...c, min: Number(e.target.value) }))} className="bg-surface-container-lowest rounded-md p-2 text-body-md" />
                    </label>
                    <label className="flex flex-col gap-1 text-label-caps uppercase tracking-wide text-on-surface-variant">
                      Skala Tertinggi
                      <input type="number" defaultValue={cfg.max ?? 5} onChange={(e) => setCfg((c) => ({ ...c, max: Number(e.target.value) }))} className="bg-surface-container-lowest rounded-md p-2 text-body-md" />
                    </label>
                    <label className="flex flex-col gap-1 text-label-caps uppercase tracking-wide text-on-surface-variant">
                      Label Rendah
                      <input defaultValue={cfg.lowLabel ?? ""} onChange={(e) => setCfg((c) => ({ ...c, lowLabel: e.target.value }))} className="bg-surface-container-lowest rounded-md p-2 text-body-md" />
                    </label>
                    <label className="flex flex-col gap-1 text-label-caps uppercase tracking-wide text-on-surface-variant">
                      Label Tinggi
                      <input defaultValue={cfg.highLabel ?? ""} onChange={(e) => setCfg((c) => ({ ...c, highLabel: e.target.value }))} className="bg-surface-container-lowest rounded-md p-2 text-body-md" />
                    </label>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setShowAdvanced((s) => !s)}
                  className="self-start text-label-caps uppercase tracking-wide text-primary-container underline"
                >
                  {showAdvanced ? "Sembunyikan pengaturan lanjutan" : "Pengaturan lanjutan"}
                </button>
                {showAdvanced && (
                  <div className="flex flex-col gap-4 bg-soft-gray rounded-md p-4">
                    <div className="flex flex-col gap-2">
                      <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Teks Contoh (opsional)</span>
                      <input name="placeholder" defaultValue={field.placeholder ?? ""} className="bg-surface-container-lowest rounded-md p-3 text-body-md" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Keterangan untuk Peserta (opsional)</span>
                      <input name="helpText" defaultValue={field.helpText ?? ""} className="bg-surface-container-lowest rounded-md p-3 text-body-md" />
                      <span className="text-label-caps text-on-surface-variant">Penjelasan tambahan di bawah pertanyaan.</span>
                    </div>
                    {type === "number" && (
                      <div className="grid grid-cols-2 gap-4">
                        <label className="flex flex-col gap-1 text-label-caps uppercase tracking-wide text-on-surface-variant">
                          Nilai Minimal
                          <input type="number" defaultValue={cfg.validations?.min ?? ""} onChange={(e) => setCfg((c) => ({ ...c, validations: { ...c.validations, min: e.target.value ? Number(e.target.value) : undefined } }))} className="bg-surface-container-lowest rounded-md p-2 text-body-md" />
                        </label>
                        <label className="flex flex-col gap-1 text-label-caps uppercase tracking-wide text-on-surface-variant">
                          Nilai Maksimal
                          <input type="number" defaultValue={cfg.validations?.max ?? ""} onChange={(e) => setCfg((c) => ({ ...c, validations: { ...c.validations, max: e.target.value ? Number(e.target.value) : undefined } }))} className="bg-surface-container-lowest rounded-md p-2 text-body-md" />
                        </label>
                      </div>
                    )}
                    {TEXT_LIKE.includes(type) && (
                      <label className="flex flex-col gap-1 text-label-caps uppercase tracking-wide text-on-surface-variant">
                        Panjang Minimal (karakter)
                        <input type="number" defaultValue={cfg.validations?.minLength ?? ""} onChange={(e) => setCfg((c) => ({ ...c, validations: { ...c.validations, minLength: e.target.value ? Number(e.target.value) : undefined } }))} className="bg-surface-container-lowest rounded-md p-2 text-body-md" />
                      </label>
                    )}
                  </div>
                )}
              </>
            )}

            <SaveButton />
          </form>

          {!field.isCore && confirmDelete && (
            <form action={deleteFormField} className="flex items-center gap-2 mt-3">
              <input type="hidden" name="id" value={field.id ?? ""} />
              <button type="submit" className="bg-error text-on-error text-label-caps uppercase tracking-wide px-4 py-2.5 rounded-md">Yakin hapus?</button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="text-label-caps uppercase tracking-wide px-3 py-2.5">Batal</button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="self-start bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-2.5 rounded-md hover:bg-primary transition-colors disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : "Simpan"}
    </button>
  );
}
