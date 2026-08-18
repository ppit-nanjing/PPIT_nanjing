"use client";

import { useRef, useState, type FormEvent } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Loader2, AlertCircle, Star } from "lucide-react";
import type { MembershipFieldDef } from "@/lib/membership-form";
import { ImageUploadCropper } from "@/components/upload/image-upload-cropper";

type Props = {
  fields: MembershipFieldDef[];
  periodId: string;
  defaults: Record<string, string>;
  action: (recruitmentPeriodId: string, formData: FormData) => void;
  authenticated?: boolean;
  preview?: boolean;
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

export function MembershipApplicationForm({ fields, periodId, defaults, action, authenticated, preview }: Props) {
  const [values, setValues] = useState<Record<string, string>>(() => ({ ...defaults }));
  const [multi, setMulti] = useState<Record<string, string[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

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
    for (const f of fields) {
      if (f.type === "section") continue;
      const v = values[f.key] ?? "";
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
      action={(fd: FormData) => action(periodId, fd)}
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

      {fields.map((f) => {
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

        return (
          <div key={f.id ?? f.key} className="flex flex-col gap-3 bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant/50">
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
