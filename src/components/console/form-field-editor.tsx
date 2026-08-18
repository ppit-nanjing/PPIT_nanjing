"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { ChevronDown, ChevronRight, GripVertical, MoreVertical, Copy } from "lucide-react";
import type { MembershipFieldDef } from "@/lib/membership-form";
import { OPTION_TYPES, SCALE_TYPES, CHOICE_TYPES, GRID_TYPES, FIELD_TYPE_LABELS, isSectionType, canDeleteField } from "@/lib/membership-form";
import { updateFormField, deleteFormField, moveFormField, duplicateFormField } from "@/app/actions/membership";

const ALL_TYPES: MembershipFieldDef["type"][] = [
  "text", "textarea", "email", "tel", "number", "select", "radio", "multiselect", "date", "checkbox", "rating", "image", "url", "section", "time", "linear_scale",   "grid_radio", "grid_checkbox", "file",
];

const TEXT_LIKE: MembershipFieldDef["type"][] = ["text", "textarea", "email", "tel", "url"];

type FieldConfig = {
  min?: number;
  max?: number;
  lowLabel?: string;
  highLabel?: string;
  rows?: string[];
  imageUrl?: string;
  points?: number;
  answerKey?: string;
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

export function FormFieldEditor({ field, index, sectionLabel, isQuiz }: { field: MembershipFieldDef; index: number; sectionLabel?: string; isQuiz?: boolean }) {
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
  const deletable = canDeleteField(field.key);
  const showOptions = OPTION_TYPES.includes(type) || GRID_TYPES.includes(type);
  const showGrid = GRID_TYPES.includes(type);
  const showRating = SCALE_TYPES.includes(type);
  const configStr = JSON.stringify(cfg) || "";
  // Derived from the textareas (not the saved field) so the answer key follows edits.
  const options = optionsText.split("\n").map((o) => o.trim()).filter(Boolean);
  const rows = rowsText.split("\n").map((r) => r.trim()).filter(Boolean);

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
                {deletable ? (
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
                ) : (
                  <p className="px-4 py-2 text-label-caps text-on-surface-variant border-t border-outline-variant/60 mt-1">
                    Tidak bisa dihapus &mdash; nama &amp; email dipakai sebagai identitas pendaftar.
                  </p>
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
                    <div className="flex flex-col gap-2">
                      <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Gambar Pertanyaan (URL, opsional)</span>
                      <input
                        placeholder="https://…"
                        defaultValue={cfg.imageUrl ?? ""}
                        onChange={(e) => setCfg((c) => ({ ...c, imageUrl: e.target.value.trim() || undefined }))}
                        className="bg-surface-container-lowest rounded-md p-3 text-body-md"
                      />
                      <span className="text-label-caps text-on-surface-variant">Tampil sebaris di bawah pertanyaan (sama seperti Google Form).</span>
                    </div>
                    {isQuiz && (
                      <div className="flex flex-col gap-4 bg-tertiary-container/20 rounded-md p-3">
                        <label className="flex flex-col gap-1 text-label-caps uppercase tracking-wide text-on-surface-variant sm:max-w-[12rem]">
                          Nilai Poin
                          <input type="number" min={0} defaultValue={cfg.points ?? ""} onChange={(e) => setCfg((c) => ({ ...c, points: e.target.value ? Number(e.target.value) : undefined }))} className="bg-surface-container-lowest rounded-md p-2 text-body-md" />
                        </label>
                        <div className="flex flex-col gap-2">
                          <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Kunci Jawaban</span>
                          <AnswerKeyEditor scope={field.id ?? field.key} type={type} options={options} rows={rows} value={cfg.answerKey ?? ""} onChange={(v) => setCfg((c) => ({ ...c, answerKey: v || undefined }))} />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            <SaveButton />
          </form>

          {deletable && confirmDelete && (
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

// Builds `config.answerKey` in the exact shape the respondent's answer is stored
// in (see the quiz-scoring notes in lib/membership-form).
function AnswerKeyEditor({
  scope,
  type,
  options,
  rows,
  value,
  onChange,
}: {
  scope: string;
  type: MembershipFieldDef["type"];
  options: string[];
  rows: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const cell = "bg-surface-container-lowest rounded-md p-2 text-body-md";

  if (GRID_TYPES.includes(type)) {
    let map: Record<string, string | string[]> = {};
    try {
      const o = JSON.parse(value || "{}");
      if (o && typeof o === "object" && !Array.isArray(o)) map = o;
    } catch {
      /* keep empty */
    }
    if (rows.length === 0 || options.length === 0) {
      return <p className="text-label-caps text-on-surface-variant">Isi baris &amp; kolom dulu untuk memilih kunci jawaban.</p>;
    }
    const multi = type === "grid_checkbox";
    const set = (rowIdx: number, col: string, checked: boolean) => {
      const next = { ...map };
      if (multi) {
        const cur = Array.isArray(next[rowIdx]) ? (next[rowIdx] as string[]) : [];
        const after = checked ? [...cur, col] : cur.filter((c) => c !== col);
        if (after.length) next[rowIdx] = after;
        else delete next[rowIdx];
      } else if (checked) {
        next[rowIdx] = col;
      } else {
        delete next[rowIdx];
      }
      onChange(Object.keys(next).length ? JSON.stringify(next) : "");
    };
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-body-md">
          <thead>
            <tr>
              <th className="text-left p-2 border-b border-outline-variant" />
              {options.map((c) => (
                <th key={c} className="p-2 border-b border-outline-variant text-label-caps uppercase tracking-wide text-on-surface-variant font-medium">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, rIdx) => (
              <tr key={rIdx} className="border-b border-outline-variant/60">
                <th scope="row" className="text-left p-2 pr-4 font-normal text-on-background align-top">{r}</th>
                {options.map((c) => (
                  <td key={c} className="text-center p-2">
                    <input
                      type={multi ? "checkbox" : "radio"}
                      name={`key-${scope}-${rIdx}`}
                      checked={multi ? Array.isArray(map[rIdx]) && (map[rIdx] as string[]).includes(c) : map[rIdx] === c}
                      onChange={(e) => set(rIdx, c, e.target.checked)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (type === "multiselect") {
    if (options.length === 0) return <p className="text-label-caps text-on-surface-variant">Isi daftar pilihan dulu.</p>;
    const picked = value.split(",").map((v) => v.trim()).filter(Boolean);
    return (
      <div className="flex flex-col gap-1">
        {options.map((o) => (
          <label key={o} className="flex items-center gap-2 text-body-md text-on-background">
            <input
              type="checkbox"
              checked={picked.includes(o)}
              onChange={(e) => onChange((e.target.checked ? [...picked, o] : picked.filter((p) => p !== o)).join(", "))}
            />
            {o}
          </label>
        ))}
        <span className="text-label-caps text-on-surface-variant">Semua pilihan yang dicentang harus dipilih peserta agar dianggap benar.</span>
      </div>
    );
  }

  if (CHOICE_TYPES.includes(type)) {
    if (options.length === 0) return <p className="text-label-caps text-on-surface-variant">Isi daftar pilihan dulu.</p>;
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)} className={cell}>
        <option value="">—</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    );
  }

  if (type === "checkbox") {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)} className={cell}>
        <option value="">—</option>
        <option value="true">Harus dicentang</option>
        <option value="false">Harus dikosongkan</option>
      </select>
    );
  }

  return (
    <>
      <input value={value} onChange={(e) => onChange(e.target.value)} className={cell} />
      <span className="text-label-caps text-on-surface-variant">Dicocokkan persis, tanpa membedakan huruf besar/kecil.</span>
    </>
  );
}
