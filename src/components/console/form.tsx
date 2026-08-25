import type { ReactNode } from "react";

// Satu kelas input untuk SELURUH konsol - menggantikan rangkaian
// "bg-soft-gray rounded-md p-3 text-body-md" yang diketik ulang di puluhan
// tempat dan mulai saling beda (p-2 vs p-2.5 vs p-3).
export const fieldInput =
  "w-full bg-soft-gray rounded-md px-3 py-2.5 text-body-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container";

interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

/** Label + kontrol + petunjuk, vertikal - bentuk isian standar konsol. */
export function Field({ label, hint, required, className = "", children }: FieldProps) {
  return (
    <label className={`flex flex-col gap-1.5 min-w-0 ${className}`}>
      <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">
        {label}
        {required && <span className="text-error" aria-hidden="true"> *</span>}
      </span>
      {children}
      {hint && <span className="text-xs text-on-surface-variant">{hint}</span>}
    </label>
  );
}

interface TextFieldProps {
  name: string;
  label: ReactNode;
  hint?: ReactNode;
  required?: boolean;
  type?: string;
  placeholder?: string;
  defaultValue?: string | number | null;
  min?: number;
  className?: string;
  /** Untuk kontrol yang dirujuk tool lain berdasarkan id (mis. AIImproveButton). */
  id?: string;
}

export function TextField({ name, label, hint, required, type = "text", placeholder, defaultValue, min, className, id }: TextFieldProps) {
  return (
    <Field label={label} hint={hint} required={required} className={className}>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue ?? undefined}
        min={min}
        className={fieldInput}
      />
    </Field>
  );
}

interface TextAreaFieldProps {
  name: string;
  label: ReactNode;
  hint?: ReactNode;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string | null;
  rows?: number;
  className?: string;
  id?: string;
}

export function TextAreaField({ name, label, hint, required, placeholder, defaultValue, rows = 3, className, id }: TextAreaFieldProps) {
  return (
    <Field label={label} hint={hint} required={required} className={className}>
      <textarea
        id={id}
        name={name}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue ?? undefined}
        rows={rows}
        className={`${fieldInput} resize-none`}
      />
    </Field>
  );
}

interface SelectFieldProps {
  name: string;
  label: ReactNode;
  hint?: ReactNode;
  required?: boolean;
  options: { value: string; label: string }[];
  defaultValue?: string;
  placeholder?: string;
  className?: string;
}

export function SelectField({ name, label, hint, required, options, defaultValue, placeholder, className }: SelectFieldProps) {
  return (
    <Field label={label} hint={hint} required={required} className={className}>
      <select
        name={name}
        required={required}
        defaultValue={defaultValue ?? (required ? "" : undefined)}
        className={fieldInput}
      >
        {(placeholder || required) && (
          <option value="" disabled={!!placeholder}>
            {placeholder ?? "—"}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

interface CheckFieldProps {
  name: string;
  label: ReactNode;
  defaultChecked?: boolean;
  hint?: ReactNode;
}

/** Checkbox bergaya baris - satu opsi ya/tidak per baris form. */
export function CheckField({ name, label, defaultChecked, hint }: CheckFieldProps) {
  return (
    <label className="flex items-start gap-2 bg-soft-gray rounded-md p-3 text-body-md cursor-pointer">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-4 w-4 mt-0.5 accent-[var(--color-primary-container)] shrink-0"
      />
      <span className="min-w-0">
        {label}
        {hint && <span className="block text-xs text-on-surface-variant">{hint}</span>}
      </span>
    </label>
  );
}

interface SectionCardProps {
  title: ReactNode;
  description?: ReactNode;
  /** Terbuka saat pertama dirender; bagian opsional boleh lipat. */
  defaultOpen?: boolean;
  children: ReactNode;
}

/**
 * Kelompok isian bernomor/bertajuk dalam satu kartu - pola yang sama dengan
 * form Kegiatan ("1 · Info Acara"). Dipakai supaya form panjang terasa
 * bertahap, bukan dinding input.
 */
export function SectionCard({ title, description, defaultOpen = true, children }: SectionCardProps) {
  return (
    <details open={defaultOpen} className="border border-outline-variant rounded-lg bg-surface-container-lowest/50">
      <summary className="px-4 py-3 cursor-pointer text-label-caps uppercase tracking-wide text-primary-container select-none">
        {title}
        {description && <span className="block text-xs normal-case tracking-normal text-on-surface-variant mt-0.5">{description}</span>}
      </summary>
      <div className="px-4 pb-4 pt-1 flex flex-col gap-3">{children}</div>
    </details>
  );
}

/** Baris tombol aksi di ekor form - selalu terlihat tanpa scroll mental. */
export function FormActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3 pt-1">{children}</div>;
}

export const primaryBtn =
  "self-start bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-5 py-2.5 rounded-md hover:bg-primary transition-colors";
export const ghostBtn =
  "text-label-caps uppercase tracking-wide border border-outline-variant px-4 py-2.5 rounded-md hover:bg-surface-container-low transition-colors";
