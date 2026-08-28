import type { ChangeEventHandler, ReactNode, SelectHTMLAttributes } from "react";
import { Check } from "lucide-react";

// Satu kelas input untuk SELURUH konsol - menggantikan rangkaian
// "bg-soft-gray rounded-md p-3 text-body-md" yang diketik ulang di puluhan
// tempat dan mulai saling beda (p-2 vs p-2.5 vs p-3).
export const fieldInput =
  "w-full bg-soft-gray rounded-md px-3 py-2.5 text-body-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container";

// Sama seperti fieldInput tapi untuk <select>: panah bawaan browser diganti
// chevron SVG (kelas pp-select di globals.css), jadi butuh padding kanan ekstra.
// Sengaja TANPA w-full supaya pemanggil yang butuh lebar lain (w-auto, flex-1)
// tidak berduel dengan urutan utilitas Tailwind.
export const selectInput =
  "pp-select bg-soft-gray rounded-md pl-3 pr-9 py-2.5 text-body-md cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container";

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

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  /** Pilihan siap-pakai; alternatifnya kirim children <option>/<optgroup> langsung. */
  options?: { value: string; label: string }[];
  placeholder?: string;
  children?: ReactNode;
}

/**
 * <select> bergaya konsol - panah custom, tanpa state apa pun, jadi bisa
 * dipakai dari server component maupun client component (onChange/value
 * diteruskan apa adanya untuk pemakaian controlled di tabel & filter).
 */
export function Select({ options, placeholder, children, className = "", ...rest }: SelectProps) {
  return (
    <select {...rest} className={`${selectInput} ${className}`}>
      {(placeholder || rest.required) && (
        // Selalu disabled: opsi kosong yang bisa dipilih lagi tidak pernah
        // diinginkan di <select> wajib maupun yang punya placeholder.
        <option value="" disabled>
          {placeholder ?? "—"}
        </option>
      )}
      {options?.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
      {children}
    </select>
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
      <Select
        name={name}
        required={required}
        options={options}
        // Sama seperti perilaku lama: required tanpa nilai awal = terpilih ke
        // opsi placeholder kosong, bukan opsi pertama.
        defaultValue={defaultValue ?? (required ? "" : undefined)}
        placeholder={placeholder}
        className="w-full"
      />
    </Field>
  );
}

interface CheckFieldProps extends Omit<React.ComponentPropsWithoutRef<"input">, "type"> {
  label: ReactNode;
  hint?: ReactNode;
}

/** Checkbox bergaya baris - satu opsi ya/tidak per baris form. */
export function CheckField({ label, hint, className, ...rest }: CheckFieldProps) {
  return (
    <label
      className={`flex items-start gap-2 bg-soft-gray rounded-md p-3 text-body-md cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-container ${className ?? ""}`}
    >
      <input
        {...rest}
        type="checkbox"
        className="h-4 w-4 mt-1 accent-[var(--color-primary-container)] shrink-0"
      />
      <span className="min-w-0">
        {label}
        {hint && <span className="block text-xs text-on-surface-variant">{hint}</span>}
      </span>
    </label>
  );
}

interface CheckboxFieldProps {
  /** Opsional: checkbox murni controlled (di luar <form>) tidak butuh nama. */
  name?: string;
  label: ReactNode;
  hint?: ReactNode;
  /** Untuk grup checkbox multi-nilai (satu nama, banyak value). */
  value?: string | number;
  defaultChecked?: boolean;
  /** Untuk pemakaian controlled di client component. */
  checked?: boolean;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Checkbox ringkas dengan kotak custom (bukan bawaan browser) - untuk slot
 * rapat seperti kolom "required" di editor. Input asli tetap yang disubmit;
 * kotaknya cuma hiasan yang mengikuti state lewat `peer-checked`.
 */
export function CheckboxField({ name, label, hint, value, defaultChecked, checked, onChange, required, disabled, className = "" }: CheckboxFieldProps) {
  return (
    <label className={`inline-flex items-start gap-2 cursor-pointer ${disabled ? "opacity-60" : ""} ${className}`}>
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        checked={checked}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded border-2 border-outline-variant bg-surface-container-lowest transition-colors peer-checked:border-primary peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary-container [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100"
      >
        <Check size={13} strokeWidth={3.5} className="text-on-primary transition-opacity" />
      </span>
      <span className="text-body-md min-w-0">
        {label}
        {hint && <span className="block text-xs text-on-surface-variant">{hint}</span>}
      </span>
    </label>
  );
}

interface ToggleSwitchProps {
  name: string;
  label?: ReactNode;
  hint?: ReactNode;
  defaultChecked?: boolean;
  /** Untuk pemakaian controlled di client component (mis. HtmFields). */
  checked?: boolean;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  disabled?: boolean;
  className?: string;
}

/**
 * Toggle on/off ala Material 3 - murni CSS (`peer-checked`), tanpa JS.
 * Track & thumb keduanya sibling langsung dari input karena `peer-checked`
 * hanya menjangkau saudara kandung input, bukan anak dari saudaranya.
 */
export function ToggleSwitch({ name, label, hint, defaultChecked, checked, onChange, disabled, className = "" }: ToggleSwitchProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${disabled ? "opacity-60" : ""} ${className}`}>
      <label className="relative inline-block h-6 w-11 shrink-0 cursor-pointer">
        <input
          type="checkbox"
          name={name}
          defaultChecked={defaultChecked}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full bg-outline-variant/70 transition-colors peer-checked:bg-primary-container peer-focus-visible:ring-2 peer-focus-visible:ring-primary-container"
        />
        <span
          aria-hidden="true"
          className="absolute left-1 top-1 h-4 w-4 rounded-full bg-surface-container-highest shadow-sm transition-all duration-200 peer-checked:left-6 peer-checked:bg-primary"
        />
      </label>
      {(label || hint) && (
        <label className={`cursor-pointer text-body-md min-w-0 ${disabled ? "cursor-default" : ""}`}>
          {label}
          {hint && <span className="block text-xs text-on-surface-variant">{hint}</span>}
        </label>
      )}
    </span>
  );
}

interface RadioGroupFieldProps {
  name: string;
  label: ReactNode;
  hint?: ReactNode;
  required?: boolean;
  options: { value: string; label: ReactNode; hint?: ReactNode }[];
  /** Nilai awal (uncontrolled). */
  defaultValue?: string;
  /** Nilai terkini + callback (controlled) - untuk form yang bereaksi pada pilihan. */
  value?: string;
  onChange?: (value: string) => void;
  /** Dua kolom di layar sedang ke atas; default satu kolom. */
  twoColumns?: boolean;
  className?: string;
}

/** Sekelompok radio bergaya kartu - satu pilihan dari beberapa opsi tetap. */
export function RadioGroupField({ name, label, hint, required, options, defaultValue, value, onChange, twoColumns, className }: RadioGroupFieldProps) {
  const controlled = value !== undefined;
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">
        {label}
        {required && <span className="text-error" aria-hidden="true"> *</span>}
      </span>
      {hint && <span className="text-xs text-on-surface-variant -mt-1">{hint}</span>}
      <div className={`grid gap-2 ${twoColumns ? "sm:grid-cols-2" : ""}`}>
        {options.map((o) => (
          <label
            key={o.value}
            className="flex items-start gap-2 bg-soft-gray rounded-md p-3 text-body-md cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-container"
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              required={required && !controlled}
              defaultChecked={controlled ? undefined : defaultValue === o.value}
              checked={controlled ? value === o.value : undefined}
              onChange={onChange ? () => onChange(o.value) : undefined}
              className="peer sr-only"
            />
            {/* Titik radio = lingkaran yang menebal saat terpilih (border trick). */}
            <span
              aria-hidden="true"
              className="mt-0.5 h-[18px] w-[18px] shrink-0 rounded-full border-2 border-outline-variant transition-all peer-checked:border-[6px] peer-checked:border-primary"
            />
            <span className="min-w-0">
              {o.label}
              {o.hint && <span className="block text-xs text-on-surface-variant">{o.hint}</span>}
            </span>
          </label>
        ))}
      </div>
    </div>
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
