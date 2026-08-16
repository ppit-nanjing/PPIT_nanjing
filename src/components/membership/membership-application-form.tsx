"use client";

import { useRef, useState, type FormEvent } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Loader2, AlertCircle } from "lucide-react";
import type { MembershipFieldDef } from "@/lib/membership-form";
import { ImageUploadCropper } from "@/components/upload/image-upload-cropper";

type Props = {
  fields: MembershipFieldDef[];
  periodId: string;
  defaults: Record<string, string>;
  action: (recruitmentPeriodId: string, formData: FormData) => void;
  authenticated?: boolean;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide py-3.5 rounded-md hover:bg-primary transition-colors flex items-center justify-center gap-2 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest"
    >
      {pending && <Loader2 size={16} className="animate-spin" />}
      {pending ? "Mengirim..." : "Kirim Pendaftaran"}
    </button>
  );
}

function isEmpty(f: MembershipFieldDef, value: string): boolean {
  if (f.type === "checkbox") return value !== "true";
  return !value.trim();
}

export function MembershipApplicationForm({ fields, periodId, defaults, action, authenticated }: Props) {
  const [values, setValues] = useState<Record<string, string>>(() => ({ ...defaults }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function update(key: string, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: "" } : e));
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    setServerError(null);
    const next: Record<string, string> = {};
    for (const f of fields) {
      if (f.required && isEmpty(f, values[f.key] ?? "")) {
        next[f.key] = f.type === "checkbox" ? "Harus dicentang." : "Field ini wajib diisi.";
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
      action={(fd) => action(periodId, fd)}
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
          "bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container";
        const value = values[f.key] ?? "";

        return (
          <div key={f.id ?? f.key} className="flex flex-col gap-2">
            {f.type === "checkbox" ? (
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id={id}
                  name={f.key}
                  value="true"
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

      <SubmitButton />
    </form>
  );
}
