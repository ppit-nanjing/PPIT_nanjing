"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { submitFormTemplate, type FormSubmitState } from "@/app/actions/forms";
import { useT } from "@/lib/i18n/client";
import { FileUploadField } from "@/components/upload/file-upload-field";
import type { FormField, FormSection } from "@/db/schema";

const CARD = "bg-surface-container-lowest border border-outline-variant rounded-xl p-5 sm:p-6 flex flex-col gap-5";
const INPUT =
  "w-full rounded-md border border-outline-variant bg-surface-container-low px-3 py-2.5 text-body-md text-on-background focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const TEXTAREA = `${INPUT} resize-y min-h-[96px]`;
const BTN =
  "inline-flex items-center justify-center gap-2 rounded-md px-6 py-3 text-label-caps uppercase tracking-wide transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function invalidClass(missing: string[] | undefined, id: string, base: string): string {
  return missing?.includes(id) ? `${base} border-error` : base;
}

function ScaleField({ f, t, missing }: { f: FormField; t: ReturnType<typeof useT>; missing?: string[] }) {
  const max = f.scaleMax ?? 5;
  const low = f.lowLabel || t("forms.scaleLow");
  const high = f.highLabel || t("forms.scaleHigh");
  const flag = missing?.includes(f.id);
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className={`text-body-md font-semibold ${flag ? "text-error" : "text-on-background"}`}>
        {f.label} {f.required && <span className="text-primary-container" aria-hidden="true">*</span>}
      </legend>
      {f.description && <p className="text-body-sm text-on-surface-variant -mt-2">{f.description}</p>}
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <label key={n} className="cursor-pointer">
            <input type="radio" name={f.id} value={n} required={f.required} className="peer sr-only" />
            <span className={`flex h-10 w-10 items-center justify-center rounded-md border bg-surface-container-low text-body-md text-on-surface-variant transition-colors ${flag ? "border-error" : "border-outline-variant"} peer-checked:border-primary-container peer-checked:bg-primary-container peer-checked:text-on-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary-container peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background`}>
              {n}
            </span>
          </label>
        ))}
      </div>
      <div className="flex max-w-[26rem] justify-between text-label-caps text-on-surface-variant">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </fieldset>
  );
}

function ChoiceField({ f, t, missing }: { f: FormField; t: ReturnType<typeof useT>; missing?: string[] }) {
  const options = f.options ?? [];
  const flag = missing?.includes(f.id);
  if (f.type === "radio") {
    return (
      <fieldset className="flex flex-col gap-2">
        <legend className={`text-body-md font-semibold ${flag ? "text-error" : "text-on-background"}`}>
          {f.label} {f.required && <span className="text-primary-container" aria-hidden="true">*</span>}
        </legend>
        {f.description && <p className="text-body-sm text-on-surface-variant -mt-1">{f.description}</p>}
        {options.map((option) => (
          <label key={option} className="flex items-center gap-2.5 text-body-md text-on-background">
            <input
              type="radio"
              name={f.id}
              value={option}
              required={f.required}
              className="h-4 w-4 accent-primary-container"
            />
            {option}
          </label>
        ))}
      </fieldset>
    );
  }
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-body-md font-semibold text-on-background">
        {f.label} {f.required && <span className="text-primary-container" aria-hidden="true">*</span>}
      </span>
      {f.description && <span className="text-body-sm text-on-surface-variant">{f.description}</span>}
      <select
        name={f.id}
        defaultValue=""
        required={f.required}
        aria-required={f.required}
        aria-invalid={flag || undefined}
        className={invalidClass(missing, f.id, INPUT)}
      >
        <option value="">{t("forms.chooseOption")}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function Field({ f, t, missing }: { f: FormField; t: ReturnType<typeof useT>; missing?: string[] }) {
  const label = (
    <span className="text-body-md font-semibold text-on-background">
      {f.label}{" "}
      {f.required ? (
        <span className="text-primary-container" aria-hidden="true">*</span>
      ) : (
        <span className="text-body-sm font-normal text-on-surface-variant">({t("forms.optional")})</span>
      )}
    </span>
  );
  const description = f.description ? (
    <span className="text-body-sm text-on-surface-variant">{f.description}</span>
  ) : null;

  if (f.type === "scale") return <ScaleField f={f} t={t} missing={missing} />;
  if (f.type === "radio" || f.type === "select") return <ChoiceField f={f} t={t} missing={missing} />;
  if (f.type === "file") {
    return (
      <div className="flex flex-col gap-1.5">
        {label}
        {description}
        <FileUploadField name={f.id} folder="form-doc" required={f.required} />
      </div>
    );
  }

  const autoComplete =
    f.type === "email" ? "email" : f.type === "tel" ? "tel" : f.id === "nama" ? "name" : undefined;

  return (
    <label className="flex flex-col gap-1.5">
      {label}
      {description}
      {f.type === "paragraph" ? (
        <textarea
          name={f.id}
          rows={4}
          maxLength={2000}
          required={f.required}
          aria-required={f.required}
          aria-invalid={missing?.includes(f.id) || undefined}
          placeholder={f.placeholder}
          className={invalidClass(missing, f.id, TEXTAREA)}
        />
      ) : (
        <input
          type={f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "email" ? "email" : f.type === "tel" ? "tel" : "text"}
          name={f.id}
          maxLength={f.type === "short_text" ? 500 : undefined}
          step={f.type === "number" ? "any" : undefined}
          required={f.required}
          aria-required={f.required}
          aria-invalid={missing?.includes(f.id) || undefined}
          autoComplete={autoComplete}
          placeholder={f.placeholder}
          className={invalidClass(missing, f.id, INPUT)}
        />
      )}
    </label>
  );
}

function MultiSelectField({ f, missing }: { f: FormField; missing?: string[] }) {
  const options = f.options ?? [];
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-body-md font-semibold text-on-background">
        {f.label} {f.required && <span className="text-primary-container" aria-hidden="true">*</span>}
      </legend>
      {f.description && <p className="text-body-sm text-on-surface-variant -mt-1">{f.description}</p>}
      {options.map((option) => (
        <label key={option} className="flex items-center gap-2.5 text-body-md text-on-background">
          <input
            type="checkbox"
            name={f.id}
            value={option}
            className="h-4 w-4 accent-primary-container"
            aria-invalid={missing?.includes(f.id) || undefined}
          />
          {option}
        </label>
      ))}
    </fieldset>
  );
}

export function FormTemplateForm({
  slug,
  title,
  sections,
  successMessage,
}: {
  slug: string;
  title: string;
  sections: FormSection[];
  successMessage: string | null;
}) {
  const t = useT();
  const [state, formAction, isPending] = useActionState<FormSubmitState, FormData>(submitFormTemplate, {});
  const [token, setToken] = useState("");
  const [doneBefore, setDoneBefore] = useState(false);
  const [manualMissing, setManualMissing] = useState<string[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      let deviceToken = "";
      try {
        deviceToken = localStorage.getItem("ppit_form_token") ?? "";
        if (!deviceToken) {
          deviceToken =
            typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
              ? crypto.randomUUID()
              : "tok-" + Date.now() + "-" + Math.random().toString(36).slice(2);
          localStorage.setItem("ppit_form_token", deviceToken);
        }
        setDoneBefore(localStorage.getItem("ppit_form_done_" + slug) === "1");
      } catch {
        deviceToken = "tok-" + Date.now() + "-" + Math.random().toString(36).slice(2);
      }
      setToken(deviceToken);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [slug]);

  useEffect(() => {
    if (state.ok) {
      try {
        localStorage.setItem("ppit_form_done_" + slug, "1");
      } catch {}
    }
  }, [state.ok, slug]);

  // Field `file` wajib tidak bisa pakai `required` HTML (input hidden diabaikan
  // browser), jadi dicek manual sebelum Server Action dipanggil.
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const form = e.currentTarget;
    for (const section of sections) {
      for (const f of section.fields) {
        if (f.type === "file" && f.required && !new FormData(form).get(f.id)) {
          e.preventDefault();
          setManualMissing([f.id]);
          return;
        }
      }
    }
    if (manualMissing.length) setManualMissing([]);
  }

  const missing = [...(state.missing ?? []), ...manualMissing];

  if (state.ok || state.already || doneBefore) {
    const already = !state.ok;
    return (
      <div className={`${CARD} items-center py-10 text-center`}>
        <CheckCircle2 className="text-primary-container" size={40} aria-hidden="true" />
        <h2 className="text-headline-md text-on-background">
          {already ? t("forms.alreadyTitle") : t("forms.thanksTitle")}
        </h2>
        <p className="text-body-md text-on-surface-variant max-w-md whitespace-pre-line">
          {already ? t("forms.alreadyBody") : successMessage || t("forms.thanksBody")}
        </p>
        <Link href="/" className={`${BTN} border border-outline-variant text-on-background hover:bg-surface-container-low`}>
          {t("forms.backHome")}
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="flex flex-col gap-5">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="token" value={token} />

      {state.error && (
        <p className="rounded-lg bg-error-container/40 px-4 py-3 text-body-md text-on-error-container" role="alert">
          {state.error === "required"
            ? t("forms.errorRequired")
            : state.error === "closed"
              ? t("forms.errorClosed")
              : state.error === "invalid"
                ? t("forms.errorInvalid")
                : t("forms.errorGeneric")}
        </p>
      )}

      <p className="text-body-sm text-on-surface-variant">
        <span className="text-primary-container" aria-hidden="true">*</span> {t("forms.requiredNote")}
      </p>

      {sections.map((section) => (
        <section key={section.id} className={CARD}>
          <div>
            <h2 className="text-headline-sm text-on-background">{section.title}</h2>
            {section.description && <p className="text-body-sm text-on-surface-variant mt-1">{section.description}</p>}
          </div>
          {section.fields.map((f) =>
            f.type === "multiselect" ? (
              <MultiSelectField key={f.id} f={f} missing={missing} />
            ) : (
              <Field key={f.id} f={f} t={t} missing={missing} />
            ),
          )}
        </section>
      ))}

      <button
        type="submit"
        disabled={isPending || !token}
        className={`${BTN} self-start bg-primary-container text-on-primary hover:bg-primary disabled:opacity-60`}
      >
        {isPending ? t("forms.submitting") : t("forms.submit")}
      </button>

      <p className="text-body-sm text-on-surface-variant">{t("forms.footer", { form: title })}</p>
    </form>
  );
}
