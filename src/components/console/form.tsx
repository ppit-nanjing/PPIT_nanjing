"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
export function Field({ label, hint, required, className = "", children }: Readonly<FieldProps>) {
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

export function TextField({ name, label, hint, required, type = "text", placeholder, defaultValue, min, className, id }: Readonly<TextFieldProps>) {
  // Delegate date/datetime-local to the modern DatePickerField
  if (type === "date" || type === "datetime-local") {
    return (
      <DatePickerField
        name={name}
        label={label}
        hint={hint}
        required={required}
        defaultValue={defaultValue as string | null}
        placeholder={placeholder}
        className={className}
        withTime={type === "datetime-local"}
      />
    );
  }

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

export function TextAreaField({ name, label, hint, required, placeholder, defaultValue, rows = 3, className, id }: Readonly<TextAreaFieldProps>) {
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

/**
 * Standalone modern select for inline use - same Radix primitives but without
 * the Field wrapper. Use when you need a select in a custom layout.
 */
export function ModernSelect({
  name,
  value,
  defaultValue,
  onValueChange,
  options,
  placeholder,
  className,
  required,
}: Readonly<{
  name: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
  required?: boolean;
}>) {
  const [internalValue, setInternalValue] = useState(value ?? defaultValue ?? "");
  const currentValue = value ?? internalValue;

  const handleChange = (v: string) => {
    setInternalValue(v);
    onValueChange?.(v);
  };

  return (
    <Select value={currentValue} onValueChange={handleChange} required={required}>
      <input type="hidden" name={name} value={currentValue} />
      <SelectTrigger
        className={cn(
          "w-full bg-soft-gray border-0 px-3 py-2.5 text-body-md rounded-md",
          "focus-visible:ring-2 focus-visible:ring-primary-container",
          "data-placeholder:text-on-surface-variant",
          className
        )}
      >
        <SelectValue placeholder={placeholder ?? "Pilih..."} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Form-wrapped modern select using Radix UI primitives - accessible, keyboard-navigable,
 * and styled to match the design system. Falls back to native <select> for
 * form submission compatibility by syncing value to a hidden input.
 */
export function SelectField({ name, label, hint, required, options, defaultValue, placeholder, className }: Readonly<SelectFieldProps>) {
  const [value, setValue] = useState(defaultValue ?? "");

  return (
    <Field label={label} hint={hint} required={required} className={className}>
      <Select value={value} onValueChange={setValue} required={required}>
        <input type="hidden" name={name} value={value} />
        <SelectTrigger
          className={cn(
            "w-full bg-soft-gray border-0 px-3 py-2.5 text-body-md rounded-md",
            "focus-visible:ring-2 focus-visible:ring-primary-container",
              "data-placeholder:text-on-surface-variant"
          )}
        >
          <SelectValue placeholder={placeholder ?? "Pilih..."} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

interface DatePickerFieldProps {
  name: string;
  label: ReactNode;
  hint?: ReactNode;
  required?: boolean;
  defaultValue?: string | Date | null;
  placeholder?: string;
  className?: string;
  /** Include time picker (hour/minute) */
  withTime?: boolean;
}

/**
 * Modern date picker using Popover + Calendar. Displays selected date in
 * Indonesian locale. Hidden input syncs value for form submission.
 */
export function DatePickerField({
  name,
  label,
  hint,
  required,
  defaultValue,
  placeholder,
  className,
  withTime = false,
}: Readonly<DatePickerFieldProps>) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(() => {
    if (!defaultValue) return undefined;
    return defaultValue instanceof Date ? defaultValue : new Date(defaultValue);
  });
  const [time, setTime] = useState(() => {
    if (!defaultValue || !withTime) return "00:00";
    const d = defaultValue instanceof Date ? defaultValue : new Date(defaultValue);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  });

  const formatValue = (d: Date | undefined) => {
    if (!d) return "";
    if (withTime) {
      const [h, m] = time.split(":");
      const dt = new Date(d);
      dt.setHours(Number.parseInt(h, 10), Number.parseInt(m, 10));
      return dt.toISOString().slice(0, 16);
    }
    return format(d, "yyyy-MM-dd");
  };

  const displayValue = (() => {
    if (!date) return undefined;
    if (withTime) return format(date, "dd MMM yyyy") + " " + time;
    return format(date, "dd MMM yyyy");
  })();

  return (
    <Field label={label} hint={hint} required={required} className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <input type="hidden" name={name} value={formatValue(date)} />
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full bg-soft-gray border-0 px-3 py-2.5 text-body-md rounded-md",
              "justify-start text-left font-normal",
              !date && "text-on-surface-variant"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {displayValue ?? <span>{placeholder ?? "Pilih tanggal..."}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => {
              setDate(d);
              if (!withTime) setOpen(false);
            }}
          />
          {withTime && (
            <div className="p-3 border-t border-outline-variant">
              <label className="flex items-center gap-2 text-sm">
                <span className="text-on-surface-variant">Waktu:</span>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="bg-soft-gray rounded px-2 py-1 text-sm"
                />
              </label>
            </div>
          )}
        </PopoverContent>
      </Popover>
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
export function CheckField({ name, label, defaultChecked, hint }: Readonly<CheckFieldProps>) {
  return (
    <label className="flex items-start gap-2 bg-soft-gray rounded-md p-3 text-body-md cursor-pointer">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
          className="h-4 w-4 mt-0.5 accent-primary-container shrink-0"
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
export function SectionCard({ title, description, defaultOpen = true, children }: Readonly<SectionCardProps>) {
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
export function FormActions({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="flex flex-wrap items-center gap-3 pt-1">{children}</div>;
}

export const primaryBtn =
  "self-start bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-5 py-2.5 rounded-md hover:bg-primary transition-colors";
export const ghostBtn =
  "text-label-caps uppercase tracking-wide border border-outline-variant px-4 py-2.5 rounded-md hover:bg-surface-container-low transition-colors";
