"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Info, Loader2, Star } from "lucide-react";
import type { MembershipFieldDef } from "@/lib/membership-form";
import { GRID_TYPES, isSectionType } from "@/lib/membership-form";
import { isSurveyFieldType, isValidFormat, surveyMaxLength } from "@/lib/survey";
import { ImageUploadCropper } from "@/components/upload/image-upload-cropper";
import { FileUploadField } from "@/components/upload/file-upload-field";
import { Select } from "@/components/console/form";
import { LinkifiedText } from "@/components/linkified-text";
import { useT } from "@/lib/i18n/client";
import { BPH_FORM_ROLE_LABEL, DIVISION_FIELD_KEY, isDivisionOprekKind, type FormKind } from "@/lib/form-types";

export type FormDivisionOption = { id: string; name: string };

type Props = {
  formId: string;
  kind: FormKind;
  fields: MembershipFieldDef[];
  // Oprek BPH: posisi yang dibuka (label event_committee_role).
  bphRoles?: string[];
  // Oprek Kepanitiaan: divisi dari Struktur Kepanitiaan acara.
  divisions?: FormDivisionOption[];
  // Identitas pengurus (read-only) dari sesi + Struktur Organisasi.
  prefill?: { fullName: string; divisionName: string | null };
  action?: (formData: FormData) => void;
  preview?: boolean;
  // Survei: blok di atas pertanyaan (biodata responden, kolom jebakan bot).
  lead?: ReactNode;
  // Survei: nama input polos di `lead` yang wajib terisi. Diperiksa di klien supaya
  // pengisi tidak kehilangan jawabannya karena penolakan dari server.
  leadRequired?: string[];
};

function isEmpty(f: MembershipFieldDef, value: string, multi: string[]): boolean {
  if (f.type === "checkbox") return value !== "true";
  if (f.type === "multiselect") return multi.length === 0;
  return !value.trim();
}

function SubmitButton({ preview, blocked, survey }: { preview?: boolean; blocked?: boolean; survey?: boolean }) {
  const t = useT();
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={preview || pending || blocked}
      className="deco-btn bg-accent text-on-accent text-label-caps uppercase py-3.5 rounded-md hover:brightness-95 transition-[filter] flex items-center justify-center gap-2 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest"
    >
      {pending && !preview && <Loader2 size={16} className="animate-spin" />}
      {preview
        ? t("forms.form.previewBtn")
        : pending
          ? t("forms.form.submitting")
          : t(survey ? "forms.form.submitSurvey" : "forms.form.submit")}
    </button>
  );
}

// Renderer formulir kabinet (Pemilu/Oprek) — kolom sistem (identitas, posisi,
// divisi pilihan) dirender dari sini, pertanyaan kustom mengikuti builder yang
// sama dengan Pendaftaran Anggota. Dipakai halaman isi publik DAN pratinjau
// console (mode preview: tombol kirim mati, unggahan diganti placeholder).
export function FormRenderer({
  formId,
  kind,
  fields,
  bphRoles = [],
  divisions = [],
  prefill,
  action,
  preview,
  lead,
  leadRequired = [],
}: Props) {
  const t = useT();
  const [values, setValues] = useState<Record<string, string>>({});
  const [multi, setMulti] = useState<Record<string, string[]>>({});
  const [position, setPosition] = useState("");
  const [choice1, setChoice1] = useState("");
  const [choice2, setChoice2] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);
  // Oprek Kepanitiaan butuh minimal satu divisi acara untuk dipilih. Tanpa
  // divisi, pilihan divisi tidak dirender tapi tetap wajib (klien & server),
  // jadi form dulu diam-diam tidak bisa dikirim — sekarang dijelaskan dan
  // tombolnya dimatikan.
  const noDivisions = isDivisionOprekKind(kind) && divisions.length === 0;
  const errorCount = Object.values(errors).filter(Boolean).length;

  function update(key: string, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: "" } : e));
  }

  function toggleMulti(key: string, option: string) {
    setMulti((m) => {
      const cur = m[key] ?? [];
      const next = cur.includes(option) ? cur.filter((o) => o !== option) : [...cur, option];
      return { ...m, [key]: next };
    });
    setErrors((e) => (e[key] ? { ...e, [key]: "" } : e));
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    if (preview) {
      e.preventDefault();
      return;
    }
    const next: Record<string, string> = {};
    // Nilai unggahan tidak hidup di state (komponen unggah mengisi hidden input
    // sendiri), jadi dibaca langsung dari form saat submit.
    const liveData = new FormData(e.currentTarget);

    for (const name of leadRequired) {
      if (!String(liveData.get(name) ?? "").trim()) next[name] = t("forms.form.errRequired");
    }
    if (kind === "oprek_bph_acara" && !position) next.sys_position = t("forms.form.errRequired");
    if (isDivisionOprekKind(kind)) {
      if (!choice1) next.sys_choice1 = t("forms.form.errRequired");
      if (choice1 && choice2 && choice1 === choice2) next.sys_choice2 = t("forms.form.errSameDivision");
    }

    for (const f of fields) {
      if (f.type === "section") continue;
      // Survei tidak mendukung unggahan: pertanyaan lama bertipe itu tidak dirender maupun diperiksa.
      if (kind === "survei" && !isSurveyFieldType(f.type)) continue;
      const v = values[f.key] ?? "";

      if (f.type === "file" || f.type === "image") {
        const uploaded = String(liveData.get(f.key) ?? "").trim();
        if (f.required && !uploaded) next[f.key] = t("forms.form.errRequired");
        continue;
      }

      if (GRID_TYPES.includes(f.type)) {
        if (f.required) {
          const rows = f.config?.rows ?? [];
          let answeredAll = true;
          try {
            const map = JSON.parse(v || "{}") as Record<string, unknown>;
            for (let i = 0; i < rows.length; i++) {
              const ans = map[String(i)];
              if (f.type === "grid_checkbox") {
                if (!Array.isArray(ans) || ans.length === 0) answeredAll = false;
              } else if (!ans) answeredAll = false;
              if (!answeredAll) break;
            }
          } catch {
            answeredAll = false;
          }
          if (!answeredAll) next[f.key] = t("forms.form.errGridRows");
        }
        continue;
      }

      if (f.required && isEmpty(f, v, multi[f.key] ?? [])) {
        next[f.key] =
          f.type === "checkbox"
            ? t("forms.form.errCheckbox")
            : f.type === "multiselect"
              ? t("forms.form.errMultiselect")
              : t("forms.form.errRequired");
        continue;
      }
      // Survei: format email/URL/telepon/tanggal/jam/angka dicek di sini dengan aturan yang sama
      // dengan server, supaya salah ketik tidak membuang seluruh isian lewat penolakan server.
      if (kind === "survei" && v.trim() && !isValidFormat(f.type, v.trim())) {
        next[f.key] = t("forms.form.errFormat");
        continue;
      }
      const val = f.config?.validations;
      if (val && !isEmpty(f, v, multi[f.key] ?? [])) {
        if (f.type === "number") {
          const num = Number(v);
          if (val.min != null && num < val.min) next[f.key] = t("forms.form.errMin", { n: val.min });
          else if (val.max != null && num > val.max) next[f.key] = t("forms.form.errMax", { n: val.max });
        } else if (typeof val.minLength === "number" && v.trim().length < val.minLength) {
          next[f.key] = t("forms.form.errMinLength", { n: val.minLength });
        }
      }
    }

    if (Object.keys(next).length > 0) {
      e.preventDefault();
      setErrors(next);
      const firstKey = Object.keys(next)[0];
      const wrapper = formRef.current?.querySelector<HTMLElement>(`#field-${CSS.escape(firstKey)}`);
      // Wrapper-nya <div>/<fieldset> yang tidak fokusabel — fokuskan kontrol
      // pertama di dalamnya (input/select/textarea/button).
      wrapper?.querySelector<HTMLElement>("input, select, textarea, button")?.focus();
      return;
    }
    setErrors({});
  }

  const errorBox = (key: string) =>
    errors[key] ? (
      <p className="text-body-sm text-error mt-1" role="alert">
        {errors[key]}
      </p>
    ) : null;

  const hasDivisionField = isDivisionOprekKind(kind) && fields.some((f) => f.key === DIVISION_FIELD_KEY);
  const divisionBlock = (
    <>
      {/* Divisi pilihan kepanitiaan */}
      {isDivisionOprekKind(kind) && divisions.length > 0 && (
        <div className="flex flex-col gap-4">
          <div id="field-sys_choice1">
            <label htmlFor="sys_choice1" className="block text-body-md text-on-background mb-2">
              {t("forms.form.choice1")} <span className="text-error">*</span>
            </label>
            <Select
              id="sys_choice1"
              name="sys_choice1"
              required
              placeholder={t("forms.form.choicePlaceholder")}
              value={choice1}
              onChange={(e) => {
                setChoice1(e.target.value);
                setErrors((er) => (er.sys_choice1 ? { ...er, sys_choice1: "" } : er));
              }}
              options={divisions.map((d) => ({ value: d.id, label: d.name }))}
              className="w-full sm:max-w-sm"
            />
            {errorBox("sys_choice1")}
          </div>
          <div id="field-sys_choice2">
            <label htmlFor="sys_choice2" className="block text-body-md text-on-background mb-2">
              {t("forms.form.choice2")}
            </label>
            <Select
              id="sys_choice2"
              name="sys_choice2"
              placeholder={t("forms.form.choicePlaceholder")}
              value={choice2}
              onChange={(e) => {
                setChoice2(e.target.value);
                setErrors((er) => (er.sys_choice2 ? { ...er, sys_choice2: "" } : er));
              }}
              options={divisions
                .filter((d) => d.id !== choice1)
                .map((d) => ({ value: d.id, label: d.name }))}
              className="w-full sm:max-w-sm"
            />
            {errorBox("sys_choice2")}
          </div>
          <p className="flex items-start gap-2 text-body-sm text-on-surface-variant bg-surface-container-low rounded-md px-3 py-2">
            <Info size={15} className="shrink-0 mt-0.5 text-primary-container" aria-hidden />
            {t("forms.form.divisionDisclaimer")}
          </p>
        </div>
      )}

      {noDivisions && (
        <div
          id="field-sys_choice1"
          className="flex items-start gap-2 bg-error-container/30 border border-outline-variant rounded-xl px-4 py-3"
          role="note"
        >
          <AlertCircle size={18} className="shrink-0 mt-0.5 text-error" aria-hidden />
          <div>
            <p className="text-body-md text-on-background">{t("forms.form.noDivisionsTitle")}</p>
            <p className="text-body-sm text-on-surface-variant">
              {t(preview ? "forms.form.noDivisionsPreview" : "forms.form.noDivisionsBody")}
            </p>
          </div>
        </div>
      )}

    </>
  );

  return (
    <form ref={formRef} action={preview ? undefined : action} onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="formId" value={formId} />

      {lead}
      {leadRequired.map((name) => (
        <div key={name}>{errorBox(name)}</div>
      ))}

      {/* Kolom sistem — identitas read-only dari akun + Struktur Organisasi */}
      {prefill && (
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
          <h2 className="text-label-caps uppercase tracking-wide text-on-surface-variant mb-3">
            {t("forms.form.identityHeading")}
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <dt className="text-label-caps uppercase tracking-wide text-on-surface-variant">{t("forms.form.fullName")}</dt>
              <dd className="text-body-lg text-on-background">{prefill.fullName || "—"}</dd>
            </div>
            <div>
              <dt className="text-label-caps uppercase tracking-wide text-on-surface-variant">
                {t("forms.form.cabinetDivision")}
              </dt>
              <dd className="text-body-lg text-on-background">{prefill.divisionName ?? "—"}</dd>
            </div>
          </dl>
          <p className="text-body-sm text-on-surface-variant mt-3">{t("forms.form.identityNote")}</p>
        </section>
      )}

      {/* Posisi BPH Acara */}
      {kind === "oprek_bph_acara" && bphRoles.length > 0 && (
        <div id="field-sys_position">
          <label htmlFor="sys_position" className="block text-body-md text-on-background mb-2">
            {t("forms.form.position")} <span className="text-error">*</span>
          </label>
          <Select
            id="sys_position"
            name="sys_position"
            required
            placeholder={t("forms.form.positionPlaceholder")}
            value={position}
            onChange={(e) => {
              setPosition(e.target.value);
              setErrors((er) => (er.sys_position ? { ...er, sys_position: "" } : er));
            }}
            options={bphRoles.map((r) => ({ value: r, label: BPH_FORM_ROLE_LABEL[r] ?? r }))}
            className="w-full sm:max-w-sm"
          />
          {errorBox("sys_position")}
        </div>
      )}

      {/* Pilihan divisi (kolom sistem): di posisi baris "Divisi Pilihan" kalau
          form punya baris itu (DIVISION_FIELD_KEY), kalau tidak paling atas. */}
      {!hasDivisionField && divisionBlock}

      {/* Pertanyaan kustom */}
      {fields.map((f) => {
        if (kind === "survei" && !isSurveyFieldType(f.type)) return null;
        const fieldId = `field-${f.key}`;
        const invalid = Boolean(errors[f.key]);

        if (f.key === DIVISION_FIELD_KEY) {
          if (!hasDivisionField) return null;
          return (
            <div key={f.id ?? f.key} className="flex flex-col gap-3">
              {f.helpText && (
                <p className="text-body-sm text-on-surface-variant whitespace-pre-wrap">
                  <LinkifiedText text={f.helpText} />
                </p>
              )}
              {divisionBlock}
            </div>
          );
        }

        if (isSectionType(f.type)) {
          return (
            <div key={f.id ?? f.key} className="bg-secondary-container/20 border border-outline-variant rounded-xl p-5 mt-2">
              <h3 className="text-headline-md text-on-background">{f.label}</h3>
              {f.helpText && (
                <p className="text-body-sm text-on-surface-variant mt-1 whitespace-pre-wrap">
                  <LinkifiedText text={f.helpText} />
                </p>
              )}
            </div>
          );
        }

        // Grup pilihan (radio/multiselect/checkbox/rating/grid) memakai
        // fieldset+legend supaya terbaca screen reader; input teks memakai
        // label htmlFor biasa.
        const isGroup =
          GRID_TYPES.includes(f.type) ||
          f.type === "radio" ||
          f.type === "multiselect" ||
          f.type === "checkbox" ||
          f.type === "rating" ||
          f.type === "linear_scale";
        const Wrapper: "fieldset" | "div" = isGroup ? "fieldset" : "div";
        const labelContent = (
          <>
            {f.label} {f.required && <span className="text-error">*</span>}
          </>
        );

        return (
          <Wrapper key={f.id ?? f.key} id={fieldId} className={isGroup ? "min-w-0" : undefined}>
            {isGroup ? (
              <legend className="block text-body-md text-on-background mb-2">{labelContent}</legend>
            ) : (
              <label className="block text-body-md text-on-background mb-2" htmlFor={`${fieldId}-input`}>
                {labelContent}
              </label>
            )}
            {f.helpText && (
              <p className="text-body-sm text-on-surface-variant mb-2 whitespace-pre-wrap">
                <LinkifiedText text={f.helpText} />
              </p>
            )}

            {GRID_TYPES.includes(f.type) ? (
              <GridInput
                fieldKey={f.key}
                multi={f.type === "grid_checkbox"}
                rows={f.config?.rows ?? []}
                cols={f.options ?? []}
                value={values[f.key] ?? ""}
                onChange={(v) => update(f.key, v)}
                disabled={preview}
              />
            ) : f.type === "radio" ? (
              <div role="radiogroup" aria-label={f.label} className="flex flex-col gap-2">
                {(f.options ?? []).map((opt) => (
                  <label key={opt} className="inline-flex items-center gap-2 text-body-md text-on-background">
                    <input
                      type="radio"
                      name={f.key}
                      value={opt}
                      checked={values[f.key] === opt}
                      onChange={() => update(f.key, opt)}
                      disabled={preview}
                      className="h-4 w-4 accent-[color:var(--color-primary-container)]"
                    />
                    {opt}
                  </label>
                ))}
              </div>
            ) : f.type === "multiselect" ? (
              <div className="flex flex-col gap-2">
                {(f.options ?? []).map((opt) => (
                  <label key={opt} className="inline-flex items-center gap-2 text-body-md text-on-background">
                    <input
                      type="checkbox"
                      name={f.key}
                      value={opt}
                      checked={(multi[f.key] ?? []).includes(opt)}
                      onChange={() => toggleMulti(f.key, opt)}
                      disabled={preview}
                      className="h-4 w-4 accent-[color:var(--color-primary-container)]"
                    />
                    {opt}
                  </label>
                ))}
              </div>
            ) : f.type === "checkbox" ? (
              <label className="inline-flex items-center gap-2 text-body-md text-on-background">
                <input
                  type="checkbox"
                  name={f.key}
                  value="true"
                  checked={values[f.key] === "true"}
                  onChange={(e) => update(f.key, e.target.checked ? "true" : "false")}
                  disabled={preview}
                  className="h-4 w-4 accent-[color:var(--color-primary-container)]"
                />
                {f.placeholder ?? "Ya"}
              </label>
            ) : f.type === "rating" || f.type === "linear_scale" ? (
              <RatingInput
                fieldKey={f.key}
                label={f.label}
                value={values[f.key] ?? ""}
                config={f.config}
                disabled={preview}
                invalid={invalid}
                onChange={(v) => update(f.key, v)}
              />
            ) : f.type === "select" ? (
              <Select
                id={`${fieldId}-input`}
                name={f.key}
                value={values[f.key] ?? ""}
                onChange={(e) => update(f.key, e.target.value)}
                disabled={preview}
                placeholder={f.placeholder ?? "—"}
                options={(f.options ?? []).map((opt) => ({ value: opt, label: opt }))}
                className="w-full sm:max-w-sm"
              />
            ) : f.type === "image" ? (
              preview ? (
                <p className="text-body-sm text-on-surface-variant bg-soft-gray rounded-md px-3 py-2">
                  Unggah gambar — tersedia saat form dibuka.
                </p>
              ) : (
                <ImageUploadCropper name={f.key} folder="form-file" />
              )
            ) : f.type === "file" ? (
              preview ? (
                <p className="text-body-sm text-on-surface-variant bg-soft-gray rounded-md px-3 py-2">
                  Unggah berkas — tersedia saat form dibuka.
                </p>
              ) : (
                <FileUploadField name={f.key} folder="form-file" required={f.required} />
              )
            ) : f.type === "textarea" ? (
              <textarea
                id={`${fieldId}-input`}
                name={f.key}
                rows={4}
                maxLength={kind === "survei" ? surveyMaxLength(f.type) : undefined}
                value={values[f.key] ?? ""}
                placeholder={f.placeholder}
                onChange={(e) => update(f.key, e.target.value)}
                disabled={preview}
                className={`w-full bg-soft-gray rounded-md p-3 text-body-md resize-y ${invalid ? "ring-2 ring-error" : ""}`}
              />
            ) : (
              <input
                id={`${fieldId}-input`}
                type={f.type === "time" ? "time" : f.type}
                name={f.key}
                maxLength={kind === "survei" ? surveyMaxLength(f.type) : undefined}
                value={values[f.key] ?? ""}
                placeholder={f.placeholder}
                onChange={(e) => update(f.key, e.target.value)}
                disabled={preview}
                className={`w-full sm:max-w-sm bg-soft-gray rounded-md p-3 text-body-md ${invalid ? "ring-2 ring-error" : ""}`}
              />
            )}

            {errors[f.key] && (
              <p className="flex items-center gap-1.5 text-body-sm text-error mt-1" role="alert">
                <AlertCircle size={13} aria-hidden /> {errors[f.key]}
              </p>
            )}
          </Wrapper>
        );
      })}

      {/* Ringkasan error di dekat tombol: kalau kolom yang bermasalah ada jauh
          di atas (atau tidak terlihat), pengisi tetap tahu kenapa tidak terkirim. */}
      {errorCount > 0 && (
        <p className="flex items-center gap-1.5 text-body-sm text-error" role="alert">
          <AlertCircle size={14} aria-hidden /> {t("forms.form.errSummary", { n: errorCount })}
        </p>
      )}
      <SubmitButton preview={preview} blocked={noDivisions} survey={kind === "survei"} />
    </form>
  );
}

function RatingInput({
  fieldKey,
  label,
  value,
  config,
  disabled,
  invalid,
  onChange,
}: {
  fieldKey: string;
  label: string;
  value: string;
  config?: { min?: number; max?: number; lowLabel?: string; highLabel?: string };
  disabled?: boolean;
  invalid?: boolean;
  onChange: (v: string) => void;
}) {
  const min = config?.min ?? 1;
  const max = config?.max ?? 5;
  const steps = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <div className="flex flex-wrap items-center gap-3 mt-1" role="radiogroup" aria-label={label}>
      {config?.lowLabel && <span className="text-label-caps text-on-surface-variant">{config.lowLabel}</span>}
      {steps.map((n) => {
        const active = value === String(n);
        return (
          <button
            key={n}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            aria-label={`${n}`}
            onClick={() => onChange(String(n))}
            className={`rounded-md p-2 transition-colors ${
              active ? "bg-primary-container text-on-primary" : "bg-soft-gray text-on-surface-variant hover:bg-surface-container"
            } ${invalid ? "ring-2 ring-error" : ""}`}
          >
            <Star size={20} className={active ? "fill-current" : ""} />
          </button>
        );
      })}
      {config?.highLabel && <span className="text-label-caps text-on-surface-variant">{config.highLabel}</span>}
      <input type="hidden" name={fieldKey} value={value} />
    </div>
  );
}

function GridInput({
  fieldKey,
  multi,
  rows,
  cols,
  value,
  disabled,
  onChange,
}: {
  fieldKey: string;
  multi: boolean;
  rows: string[];
  cols: string[];
  value: string;
  disabled?: boolean;
  onChange: (v: string) => void;
}) {
  const t = useT();
  const parse = (): Record<string, string | string[]> => {
    try {
      const o = JSON.parse(value || "{}");
      if (o && typeof o === "object") return o as Record<string, string | string[]>;
    } catch {
      /* ignore */
    }
    return {};
  };
  const map = parse();

  function handle(rowIdx: number, col: string, checked: boolean) {
    const next: Record<string, string | string[]> = { ...map };
    if (multi) {
      const cur = Array.isArray(next[rowIdx]) ? (next[rowIdx] as string[]) : [];
      next[rowIdx] = checked ? [...cur, col] : cur.filter((c) => c !== col);
    } else {
      next[rowIdx] = col;
    }
    onChange(JSON.stringify(next));
  }

  if (rows.length === 0 || cols.length === 0) {
    return <p className="text-label-caps text-on-surface-variant">{t("forms.form.gridNotConfigured")}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-body-md">
        <thead>
          <tr>
            <th className="text-left p-2 border-b border-outline-variant" />
            {cols.map((c) => (
              <th key={c} className="text-center p-2 border-b border-outline-variant text-label-caps uppercase tracking-wide text-on-surface-variant font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, rIdx) => (
            <tr key={rIdx} className="border-b border-outline-variant/60">
              <th scope="row" className="text-left p-2 pr-4 font-normal text-on-background align-top">
                {r}
              </th>
              {cols.map((c) => {
                const checked = multi ? Array.isArray(map[rIdx]) && (map[rIdx] as string[]).includes(c) : map[rIdx] === c;
                return (
                  <td key={c} className="text-center p-2">
                    <input
                      type={multi ? "checkbox" : "radio"}
                      name={`${fieldKey}::${rIdx}`}
                      value={c}
                      aria-label={`${r} — ${c}`}
                      checked={checked}
                      disabled={disabled}
                      onChange={(e) => handle(rIdx, c, e.target.checked)}
                      className="h-5 w-5 accent-[color:var(--color-primary-container)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
