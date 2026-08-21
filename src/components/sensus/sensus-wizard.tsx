"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ChevronRight, ChevronLeft, Check, AlertTriangle, Loader2 } from "lucide-react";
import { submitSensusProfile, saveSensusStep, type SensusInput } from "@/app/actions/sensus";
import { ImageUploadCropper } from "@/components/upload/image-upload-cropper";
import { useT, useLocale } from "@/lib/i18n/client";
import { INTL_LOCALE } from "@/lib/i18n/config";
import type { TKey } from "@/lib/i18n/dictionaries/id";

const STEP_KEYS = ["sensus.stepBiodata", "sensus.stepStudentData", "sensus.stepContact"] as const;

const GENDER_OPTIONS = ["Laki-Laki", "Perempuan"];
const STUDENT_STATUS_OPTIONS = ["Mahasiswa Aktif", "Mahasiswa Non-Aktif", "Cuti", "Lulus"];
const DEGREE_OPTIONS = ["D3", "S1", "S2", "S3", "Sekolah Bahasa", "Lainnya"];
const FUNDING_OPTIONS = ["Self-funded", "Partial Scholarship", "Full Scholarship"];

// Maps a stored option value to its dictionary key. The submitted/stored value
// stays the Indonesian source string (data integrity), only the displayed
// label is translated.
const OPTION_KEYS: Record<string, TKey> = {
  "Laki-Laki": "sensus.genderMale",
  "Perempuan": "sensus.genderFemale",
  "Mahasiswa Aktif": "sensus.statusActive",
  "Mahasiswa Non-Aktif": "sensus.statusInactive",
  "Cuti": "sensus.statusLeave",
  "Lulus": "sensus.statusGraduate",
  "D3": "sensus.degreeD3",
  "S1": "sensus.degreeS1",
  "S2": "sensus.degreeS2",
  "S3": "sensus.degreeS3",
  "Sekolah Bahasa": "sensus.degreeLang",
  "Lainnya": "sensus.degreeOther",
  "Self-funded": "sensus.fundSelf",
  "Partial Scholarship": "sensus.fundPartial",
  "Full Scholarship": "sensus.fundFull",
};

function optionLabel(t: (k: TKey, vars?: Record<string, string | number>) => string, value: string): string {
  const key = OPTION_KEYS[value];
  return key ? t(key as TKey) : value;
}

function PhoneField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const t = useT();
  const prefix = value.startsWith("+86") ? "+86" : value.startsWith("+62") ? "+62" : "+62";
  const national = value.replace(/^\+62/, "").replace(/^\+86/, "").replace(/^0+/, "");

  function handlePrefix(next: string) {
    let n = national.replace(/^0+/, "");
    if (next === "+62" && n.startsWith("62")) n = n.slice(2);
    if (next === "+86" && n.startsWith("86")) n = n.slice(2);
    onChange(next + n);
  }

  function handleNational(raw: string) {
    let n = raw.replace(/[^\d]/g, "").replace(/^0+/, "");
    if (prefix === "+62" && n.startsWith("62")) n = n.slice(2);
    if (prefix === "+86" && n.startsWith("86")) n = n.slice(2);
    onChange(prefix + n);
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">
        {label}
        <span className="text-error" aria-hidden="true"> *</span>
      </span>
      <div className="flex gap-2">
        <select
          value={prefix}
          onChange={(e) => handlePrefix(e.target.value)}
          aria-label={t("sensus.countryCodeAria")}
          className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container shrink-0"
        >
          <option value="+62">+62</option>
          <option value="+86">+86</option>
        </select>
        <input
          type="tel"
          inputMode="numeric"
          value={national}
          onChange={(e) => handleNational(e.target.value)}
          placeholder="85211849390"
          aria-required="true"
          className="bg-soft-gray rounded-md p-3 text-body-md flex-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
        />
      </div>
      <span className="text-xs text-on-surface-variant">
        {t("sensus.phoneHint")}
      </span>
    </div>
  );
}

export function SensusWizard({
  initial,
  returnTo,
  branchOptions,
}: {
  initial: Partial<SensusInput>;
  returnTo?: string;
  branchOptions: string[];
}) {
  const t = useT();
  const locale = useLocale();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<SensusInput>({
    fullName: initial.fullName ?? "",
    passportNumber: initial.passportNumber ?? "",
    gender: initial.gender ?? "",
    passportExpiry: initial.passportExpiry ?? "",
    province: initial.province ?? "",
    birthDate: initial.birthDate ?? "",
    branch: initial.branch ?? "",
    studentStatus: initial.studentStatus ?? "",
    university: initial.university ?? "",
    degreeLevel: initial.degreeLevel ?? "",
    major: initial.major ?? "",
    fundingSource: initial.fundingSource ?? "",
    entryYear: initial.entryYear ?? "",
    graduationYear: initial.graduationYear ?? "",
    wechatId: initial.wechatId ?? "",
    phoneActive: initial.phoneActive ?? "",
    whatsappNumber: initial.whatsappNumber ?? "",
    studentCardUrl: initial.studentCardUrl ?? "",
    agreeTerms: initial.agreeTerms ?? false,
  });
  const [pending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const stepRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const first = stepRef.current?.querySelector<HTMLElement>("input, select, textarea, button");
    first?.focus();
  }, [step]);

  function update<K extends keyof SensusInput>(key: K, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function goNext() {
    setSaving(true);
    startTransition(async () => {
      const result = await saveSensusStep(form);
      setSaving(false);
      if (!("error" in result)) setLastSaved(new Date(result.savedAt));
      setStep((s) => Math.min(STEP_KEYS.length - 1, s + 1));
    });
  }

  function handleSubmit() {
    setSubmitError(null);
    startTransition(async () => {
      const result = await submitSensusProfile(returnTo ?? null, form);
      // A successful submit redirects server-side and never returns here.
      if (result && "error" in result) {
        if (result.error === "student_card_required") {
          setSubmitError(t("sensus.errStudentCardRequired"));
          setStep(1);
        } else if (result.error === "terms_required") {
          setSubmitError(t("sensus.errTermsRequired"));
          setStep(2);
        }
      }
    });
  }

  const field = (
    label: string,
    key: keyof SensusInput,
    opts?: { type?: string; hint?: string; options?: string[]; required?: boolean; placeholder?: string }
  ) => {
    const id = `sensus-${key}`;
    const hintId = `sensus-hint-${key}`;
    return (
      <div className="flex flex-col gap-2">
        <label htmlFor={id} className="text-label-caps uppercase tracking-wide text-on-surface-variant">
          {label}
          {opts?.required && <span className="text-error" aria-hidden="true"> *</span>}
        </label>
        {opts?.options ? (
          <select
            id={id}
            value={form[key] as string}
            onChange={(e) => update(key, e.target.value)}
            aria-required={opts.required || undefined}
            aria-describedby={opts.hint ? hintId : undefined}
            className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
          >
            <option value="">{t("sensus.selectPlaceholder", { label })}</option>
            {opts.options.map((o) => (
              <option key={o} value={o}>
                {optionLabel(t, o)}
              </option>
            ))}
          </select>
        ) : (
          <input
            id={id}
            type={opts?.type ?? "text"}
            value={form[key] as string}
            onChange={(e) => update(key, e.target.value)}
            placeholder={opts?.placeholder}
            aria-required={opts?.required || undefined}
            aria-describedby={opts?.hint ? hintId : undefined}
            className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
          />
        )}
        {opts?.hint && (
          <span id={hintId} className="text-xs text-on-surface-variant">
            {opts.hint}
          </span>
        )}
      </div>
    );
  };

  return (
    <div>
      <p className="text-label-caps uppercase tracking-wide text-on-surface-variant mb-3" aria-live="polite">
        {t("sensus.stepProgress", { current: step + 1, total: STEP_KEYS.length, step: t(STEP_KEYS[step]) })}
      </p>
      <div className="flex items-center gap-2 mb-8">
        {STEP_KEYS.map((k, i) => (
          <div key={k} className="flex items-center gap-2 flex-1">
            <div
              aria-current={i === step ? "step" : undefined}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-label-caps font-semibold shrink-0 ${
                i <= step ? "bg-primary-container text-on-primary" : "bg-surface-container-low text-on-surface-variant"
              }`}
            >
              {i + 1}
            </div>
            <span
              className={`text-label-caps hidden sm:block ${
                i === step ? "text-on-background font-medium" : "text-on-surface-variant"
              }`}
            >
              {t(k)}
            </span>
            {i < STEP_KEYS.length - 1 && <div className="flex-1 h-px bg-outline-variant" />}
          </div>
        ))}
      </div>

      <div ref={stepRef} className="flex flex-col gap-6 mb-10">
        {step === 0 && (
          <fieldset className="contents">
            <legend className="sr-only">{t(STEP_KEYS[0])}</legend>
            {field(t("sensus.fullName"), "fullName", { required: true })}
            {field(t("sensus.passportNumber"), "passportNumber", {
              required: true,
              hint: t("sensus.passportHint"),
              placeholder: "X3XXXX18",
            })}
            {field(t("sensus.gender"), "gender", { options: GENDER_OPTIONS, required: true })}
            {field(t("sensus.birthDate"), "birthDate", { type: "date", required: true })}
            {field(t("sensus.province"), "province", {
              required: true,
              hint: t("sensus.provinceHint"),
              placeholder: "Banten",
            })}
            {field(t("sensus.passportExpiry"), "passportExpiry", { type: "date", required: true })}
          </fieldset>
        )}
        {step === 1 && (
          <fieldset className="contents">
            <legend className="sr-only">{t(STEP_KEYS[1])}</legend>
            {field(t("sensus.branch"), "branch", { options: branchOptions, required: true })}
            {field(t("sensus.studentStatus"), "studentStatus", { options: STUDENT_STATUS_OPTIONS, required: true })}
            {field(t("sensus.university"), "university", {
              required: true,
              placeholder: "Nanjing Xiaozhuang University",
            })}
            {field(t("sensus.degreeLevel"), "degreeLevel", { options: DEGREE_OPTIONS, required: true })}
            {field(t("sensus.major"), "major", {
              required: true,
              placeholder: "Software Engineer",
            })}
            {field(t("sensus.fundingSource"), "fundingSource", { options: FUNDING_OPTIONS, required: true })}
            {field(t("sensus.entryYear"), "entryYear", { type: "number", required: true, placeholder: "2025" })}
            {field(t("sensus.graduationYear"), "graduationYear", {
              type: "number",
              required: true,
              placeholder: "2027",
            })}
            <ImageUploadCropper
              folder="sensus"
              label={t("sensus.studentCardLabel")}
              required
              value={form.studentCardUrl}
              onValueChange={(url) => update("studentCardUrl", url)}
            />
          </fieldset>
        )}
        {step === 2 && (
          <fieldset className="contents">
            <legend className="sr-only">{t(STEP_KEYS[2])}</legend>
            {field(t("sensus.wechatId"), "wechatId", { required: true, placeholder: "Xevuin12" })}
            <PhoneField
              label={t("sensus.phoneActive")}
              value={form.phoneActive}
              onChange={(v) => update("phoneActive", v)}
            />
            <PhoneField
              label={t("sensus.whatsappNumber")}
              value={form.whatsappNumber}
              onChange={(v) => update("whatsappNumber", v)}
            />
            <label className="flex items-start gap-3 bg-soft-gray rounded-md p-3 cursor-pointer">
              <input
                id="sensus-agreeTerms"
                type="checkbox"
                checked={form.agreeTerms}
                onChange={(e) => update("agreeTerms", e.target.checked)}
                aria-required="true"
                className="mt-1 accent-[var(--color-primary-container)]"
              />
              <span className="text-body-md text-on-background">
                {t("sensus.agreeTerms")}
                <span className="text-error" aria-hidden="true"> *</span>
              </span>
            </label>
          </fieldset>
        )}
      </div>

      {submitError && (
        <div
          role="alert"
          aria-live="assertive"
          className="flex items-start gap-3 bg-error-container/40 border-l-4 border-error rounded-r-lg p-4 mb-6"
        >
          <AlertTriangle className="text-error shrink-0 mt-0.5" size={18} />
          <p className="text-body-md text-on-background">{submitError}</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || pending}
            className="flex items-center gap-1 text-label-caps text-secondary hover:text-on-background disabled:opacity-30 transition-colors rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
          >
            <ChevronLeft size={16} /> {t("sensus.prev")}
          </button>
          <span aria-live="polite" className="flex items-center gap-2">
            {lastSaved && !saving && (
              <span className="flex items-center gap-1 text-xs text-on-surface-variant">
                <Check size={12} className="text-primary-container" />
                {t("sensus.savedAt", {
                  time: lastSaved.toLocaleTimeString(INTL_LOCALE[locale], { hour: "2-digit", minute: "2-digit" }),
                })}
              </span>
            )}
            {saving && <span className="text-xs text-on-surface-variant">{t("sensus.savingProgress")}</span>}
          </span>
        </div>

        {step < STEP_KEYS.length - 1 ? (
          <button
            onClick={goNext}
            disabled={pending}
            className="flex items-center gap-1 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {t("sensus.next")} <ChevronRight size={16} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={pending}
            className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors disabled:opacity-60 flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {pending && <Loader2 />}
            {pending ? t("sensus.saving") : t("sensus.saveSensus")}
          </button>
        )}
      </div>
    </div>
  );
}
