"use client";

import { useRef, useState, useMemo, useEffect, type FormEvent } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Loader2, AlertCircle, Star } from "lucide-react";
import type { MembershipFieldDef } from "@/lib/membership-form";
import { GRID_TYPES, CORE_KEYS, isSectionType } from "@/lib/membership-form";
import { ImageUploadCropper } from "@/components/upload/image-upload-cropper";
import { FileUploadField } from "@/components/upload/file-upload-field";

type Props = {
  fields: MembershipFieldDef[];
  periodId: string;
  defaults: Record<string, string>;
  action?: (recruitmentPeriodId: string, formData: FormData) => void;
  authenticated?: boolean;
  preview?: boolean;
  showProgress?: boolean;
  shuffle?: boolean;
  collectEmail?: boolean;
};

function SubmitButton({ preview }: { preview?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || preview}
      className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide py-3.5 rounded-md hover:bg-primary transition-colors flex items-center justify-center gap-2 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest"
    >
      {pending && <Loader2 size={16} className="animate-spin" />}
      {preview ? "Pratinjau (tidak dikirim)" : pending ? "Mengirim..." : "Kirim Pendaftaran"}
    </button>
  );
}

function isEmpty(f: MembershipFieldDef, value: string, multi: string[]): boolean {
  if (f.type === "checkbox") return value !== "true";
  if (f.type === "multiselect") return multi.length === 0;
  return !value.trim();
}

export function MembershipApplicationForm({ fields, periodId, defaults, action, authenticated, preview, showProgress, shuffle, collectEmail = true }: Props) {
  const [values, setValues] = useState<Record<string, string>>(() => ({ ...defaults }));
  const [multi, setMulti] = useState<Record<string, string[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // With "kumpulkan email" off we take the address from the signed-in account
  // instead of asking again. Anonymous visitors still have to type it — the
  // application row needs an email either way.
  const hideEmail = !collectEmail && Boolean(authenticated) && Boolean(defaults.email);
  const visible = useMemo(
    () => fields.filter((f) => !(hideEmail && f.key === CORE_KEYS.email)),
    [fields, hideEmail],
  );

  // Shuffle the custom questions once, after mount. The order has to be random
  // per visitor, so it cannot be computed during render — that would be impure
  // and would desync the server-rendered order from the client's. Section
  // headers and core data-diri fields stay put, and questions only move within
  // their own section, same as Google Forms.
  const [shuffled, setShuffled] = useState<MembershipFieldDef[] | null>(null);
  useEffect(() => {
    if (!shuffle) return;
    const out = [...visible];
    let blockStart = 0;
    const shuffleBlock = (end: number) => {
      const slots: number[] = [];
      for (let i = blockStart; i < end; i++) {
        if (!out[i].isCore && !isSectionType(out[i].type)) slots.push(i);
      }
      for (let i = slots.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [out[slots[i]], out[slots[j]]] = [out[slots[j]], out[slots[i]]];
      }
    };
    for (let i = 0; i < out.length; i++) {
      if (isSectionType(out[i].type)) {
        shuffleBlock(i);
        blockStart = i + 1;
      }
    }
    shuffleBlock(out.length);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only randomness; see above
    setShuffled(out);
  }, [visible, shuffle]);
  const ordered = shuffle && shuffled ? shuffled : visible;

  const questionFields = visible.filter((f) => !isSectionType(f.type));
  const answeredCount = questionFields.filter((f) => {
    const v = values[f.key] ?? "";
    if (GRID_TYPES.includes(f.type)) {
      try {
        const map = JSON.parse(v || "{}") as Record<string, unknown>;
        return Object.values(map).some((a) => (Array.isArray(a) ? a.length > 0 : Boolean(a)));
      } catch {
        return false;
      }
    }
    return !isEmpty(f, v, multi[f.key] ?? []);
  }).length;

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
    setServerError(null);
    const next: Record<string, string> = {};
    // `visible`, not `fields` — a question that isn't rendered must never block submit.
    for (const f of visible) {
      if (f.type === "section") continue;
      const v = values[f.key] ?? "";

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
          if (!answeredAll) next[f.key] = "Isi semua baris.";
        }
        continue;
      }

      if (f.required && isEmpty(f, v, multi[f.key] ?? [])) {
        next[f.key] =
          f.type === "checkbox"
            ? "Harus dicentang."
            : f.type === "multiselect"
              ? "Pilih minimal satu."
              : "Field ini wajib diisi.";
        continue;
      }
      const val = f.config?.validations;
      if (val && !isEmpty(f, v, multi[f.key] ?? [])) {
        if (f.type === "number") {
          const num = Number(v);
          if (val.min != null && num < val.min) next[f.key] = `Nilai minimal ${val.min}.`;
          else if (val.max != null && num > val.max) next[f.key] = `Nilai maksimal ${val.max}.`;
        } else if (typeof val.minLength === "number" && v.trim().length < val.minLength) {
          next[f.key] = `Minimal ${val.minLength} karakter.`;
        }
      }
    }
    if (Object.keys(next).length > 0) {
      e.preventDefault();
      setErrors(next);
      const firstKey = fields.find((f) => next[f.key])?.key;
      if (firstKey) {
        const el = formRef.current?.querySelector<HTMLElement>(`#field-${CSS.escape(firstKey)}`);
        el?.focus();
      }
      return;
    }
    setErrors({});
  }

  return (
    <form
      ref={formRef}
      action={preview || !action ? undefined : (fd: FormData) => action(periodId, fd)}
      onSubmit={handleSubmit}
      className="flex flex-col gap-6"
      noValidate
    >
      {serverError && (
        <div
          role="alert"
          aria-live="assertive"
          className="flex items-start gap-2 bg-error-container/40 border-l-4 border-error rounded-r-lg p-3"
        >
          <AlertCircle className="text-error shrink-0 mt-0.5" size={16} />
          <p className="text-body-sm text-on-background">{serverError}</p>
        </div>
      )}

      {showProgress && questionFields.length > 0 && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4">
          <div className="flex items-center justify-between text-label-caps text-on-surface-variant mb-1">
            <span>Progres Pengisian</span>
            <span>
              {answeredCount}/{questionFields.length}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="Progres pengisian formulir"
            aria-valuemin={0}
            aria-valuemax={questionFields.length}
            aria-valuenow={answeredCount}
            className="h-2 rounded-full bg-soft-gray overflow-hidden"
          >
            <div className="h-full bg-primary-container transition-all" style={{ width: `${(answeredCount / questionFields.length) * 100}%` }} />
          </div>
        </div>
      )}

      {ordered.map((f) => {
        const id = `field-${f.key}`;
        const errId = `err-${f.key}`;
        const helpId = `help-${f.key}`;
        const describedBy = [f.helpText ? helpId : null, errors[f.key] ? errId : null].filter(Boolean).join(" ") || undefined;
        const invalid = Boolean(errors[f.key]);
        const common =
          "bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container disabled:opacity-70";
        const value = values[f.key] ?? "";

        if (f.type === "section") {
          return (
            <div key={f.id ?? f.key} className="flex flex-col gap-1 bg-secondary-container/30 rounded-xl p-5 border-l-4 border-secondary-container">
              <h3 className="text-headline-sm text-on-background">{f.label}</h3>
              {f.helpText && <p className="text-body-md text-on-surface-variant">{f.helpText}</p>}
            </div>
          );
        }

        if (f.type === "grid_radio" || f.type === "grid_checkbox") {
          const rows = f.config?.rows ?? [];
          const cols = f.options ?? [];
          return (
            <div key={f.id ?? f.key} className="flex flex-col gap-3 bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant/50">
              <div className="flex flex-col gap-1">
                <span className="text-body-md font-medium text-on-background">
                  {f.label}
                  {f.required && <span className="text-error" aria-hidden="true"> *</span>}
                </span>
                {f.helpText && <span className="text-label-caps text-on-surface-variant">{f.helpText}</span>}
              </div>
              <GridInput
                fieldKey={f.key}
                multi={f.type === "grid_checkbox"}
                rows={rows}
                cols={cols}
                value={value}
                disabled={preview}
                onChange={(v) => update(f.key, v)}
              />
              {errors[f.key] && (
                <p id={errId} role="alert" className="text-body-sm text-error flex items-center gap-1">
                  <AlertCircle size={14} className="shrink-0" /> {errors[f.key]}
                </p>
              )}
            </div>
          );
        }

        return (
          <div key={f.id ?? f.key} className="flex flex-col gap-3 bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant/50">
            {f.config?.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={f.config.imageUrl} alt="" className="rounded-md max-h-56 w-auto object-contain" />
            )}
            {f.type === "checkbox" ? (
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id={id}
                  name={f.key}
                  value="true"
                  disabled={preview}
                  checked={value === "true"}
                  aria-invalid={invalid}
                  aria-describedby={describedBy}
                  onChange={(e) => update(f.key, e.target.checked ? "true" : "")}
                  className="mt-1 h-5 w-5 accent-[color:var(--color-primary-container)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
                />
                <label htmlFor={id} className="flex flex-col gap-1">
                  <span className="text-body-md text-on-surface-variant">
                    {f.placeholder ?? f.label}
                    {f.required && <span className="text-error" aria-hidden="true"> *</span>}
                  </span>
                  {f.helpText && (
                    <span id={helpId} className="text-label-caps text-on-surface-variant">
                      {f.helpText}
                    </span>
                  )}
                </label>
              </div>
            ) : f.type === "radio" ? (
              <fieldset>
                <legend className="text-label-caps uppercase tracking-wide text-on-surface-variant">
                  {f.label}
                  {f.required && <span className="text-error" aria-hidden="true"> *</span>}
                </legend>
                {f.helpText && (
                  <p id={helpId} className="text-label-caps text-on-surface-variant mb-2">
                    {f.helpText}
                  </p>
                )}
                <div className="flex flex-col gap-2 mt-1">
                  {(f.options ?? []).map((opt) => (
                    <label key={opt} className="flex items-center gap-3 text-body-md text-on-background">
                      <input
                        type="radio"
                        name={f.key}
                        value={opt}
                        disabled={preview}
                        checked={value === opt}
                        onChange={(e) => update(f.key, e.target.value)}
                        className="h-5 w-5 accent-[color:var(--color-primary-container)]"
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : f.type === "multiselect" ? (
              <fieldset>
                <legend className="text-label-caps uppercase tracking-wide text-on-surface-variant">
                  {f.label}
                  {f.required && <span className="text-error" aria-hidden="true"> *</span>}
                </legend>
                {f.helpText && (
                  <p id={helpId} className="text-label-caps text-on-surface-variant mb-2">
                    {f.helpText}
                  </p>
                )}
                <div className="flex flex-col gap-2 mt-1">
                  {(f.options ?? []).map((opt) => (
                    <label key={opt} className="flex items-center gap-3 text-body-md text-on-background">
                      <input
                        type="checkbox"
                        name={f.key}
                        value={opt}
                        disabled={preview}
                        checked={(multi[f.key] ?? []).includes(opt)}
                        aria-invalid={invalid}
                        onChange={() => toggleMulti(f.key, opt)}
                        className="h-5 w-5 accent-[color:var(--color-primary-container)]"
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : f.type === "rating" || f.type === "linear_scale" ? (
              <fieldset>
                <legend className="text-label-caps uppercase tracking-wide text-on-surface-variant">
                  {f.label}
                  {f.required && <span className="text-error" aria-hidden="true"> *</span>}
                </legend>
                {f.helpText && (
                  <p id={helpId} className="text-label-caps text-on-surface-variant mb-2">
                    {f.helpText}
                  </p>
                )}
                <RatingInput
                  fieldKey={f.key}
                  value={value}
                  config={f.config}
                  disabled={preview}
                  invalid={invalid}
                  onChange={(v) => update(f.key, v)}
                />
              </fieldset>
            ) : (
              <label htmlFor={id} className="flex flex-col gap-2">
                <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">
                  {f.label}
                  {f.required && <span className="text-error" aria-hidden="true"> *</span>}
                </span>
                {f.type === "textarea" ? (
                  <textarea
                    id={id}
                    name={f.key}
                    rows={f.key === "motivation" ? 5 : 3}
                    placeholder={f.placeholder}
                    disabled={preview}
                    value={value}
                    aria-invalid={invalid}
                    aria-describedby={describedBy}
                    onChange={(e) => update(f.key, e.target.value)}
                    className={`${common} resize-none`}
                  />
                ) : f.type === "select" ? (
                  <select
                    id={id}
                    name={f.key}
                    disabled={preview}
                    value={value}
                    aria-invalid={invalid}
                    aria-describedby={describedBy}
                    onChange={(e) => update(f.key, e.target.value)}
                    className={common}
                  >
                    <option value="" disabled>
                      Pilih…
                    </option>
                    {(f.options ?? []).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                 ) : f.type === "image" ? (
                  authenticated ? (
                    <ImageUploadCropper name={f.key} folder="membership" aspect={1} required={f.required} />
                  ) : (
                    <div className="flex flex-col gap-1 rounded-md border border-dashed border-outline-variant bg-soft-gray p-4">
                      <p className="text-body-sm text-on-surface-variant">
                        Untuk unggah gambar, silakan masuk terlebih dahulu.
                      </p>
                      <Link href="/login" className="text-body-sm text-primary-container underline rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container">
                        Masuk
                      </Link>
                    </div>
                  )
                ) : f.type === "file" ? (
                  authenticated ? (
                    <FileUploadField name={f.key} folder="membership" required={f.required} value={value} disabled={preview} />
                  ) : (
                    <div className="flex flex-col gap-1 rounded-md border border-dashed border-outline-variant bg-soft-gray p-4">
                      <p className="text-body-sm text-on-surface-variant">
                        Untuk unggah berkas, silakan masuk terlebih dahulu.
                      </p>
                      <Link href="/login" className="text-body-sm text-primary-container underline rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container">
                        Masuk
                      </Link>
                    </div>
                  )
                ) : (
                  <input
                    id={id}
                    type={f.type}
                    name={f.key}
                    required={f.required}
                    disabled={preview}
                    placeholder={f.placeholder}
                    value={value}
                    aria-invalid={invalid}
                    aria-describedby={describedBy}
                    onChange={(e) => update(f.key, e.target.value)}
                    className={common}
                  />
                )}
                {f.helpText && (
                  <span id={helpId} className="text-label-caps text-on-surface-variant">
                    {f.helpText}
                  </span>
                )}
              </label>
            )}

            {errors[f.key] && (
              <p id={errId} role="alert" className="text-body-sm text-error flex items-center gap-1">
                <AlertCircle size={14} className="shrink-0" /> {errors[f.key]}
              </p>
            )}
          </div>
        );
      })}

      <SubmitButton preview={preview} />
    </form>
  );
}

function RatingInput({
  fieldKey,
  value,
  config,
  disabled,
  invalid,
  onChange,
}: {
  fieldKey: string;
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
    <div className="flex items-center gap-3 mt-1" role="radiogroup" aria-label={fieldKey}>
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
            <span className="sr-only">{n}</span>
          </button>
        );
      })}
      <input type="hidden" name={fieldKey} value={value} />
      {config?.lowLabel && <span className="text-label-caps text-on-surface-variant">{config.lowLabel}</span>}
      {config?.highLabel && <span className="text-label-caps text-on-surface-variant">{config.highLabel}</span>}
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
    return <p className="text-label-caps text-on-surface-variant">Atur baris &amp; kolom di pengaturan formulir.</p>;
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
                const checked = multi
                  ? Array.isArray(map[rIdx]) && (map[rIdx] as string[]).includes(c)
                  : map[rIdx] === c;
                return (
                  <td key={c} className="text-center p-2">
                    <input
                      type={multi ? "checkbox" : "radio"}
                      name={`${fieldKey}::${rIdx}`}
                      value={c}
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
