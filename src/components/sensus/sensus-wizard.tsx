"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ChevronRight, ChevronLeft, Check, AlertTriangle, Loader2 } from "lucide-react";
import { submitSensusProfile, saveSensusStep } from "@/app/actions/sensus";
import { ImageUploadCropper } from "@/components/upload/image-upload-cropper";
import { Select, CheckField } from "@/components/console/form";
import { PassportScanner } from "@/components/sensus/passport-scanner";
import { useT, useLocale } from "@/lib/i18n/client";
import { INTL_LOCALE } from "@/lib/i18n/config";
import { INDONESIA_PROVINCES } from "@/lib/indonesia-provinces";
import {
  DEGREE_OPTIONS,
  FUNDING_OPTIONS,
  GENDER_OPTIONS,
  STUDENT_STATUS_OPTIONS,
  UNIVERSITY_OTHER,
  validateSensus,
  type SensusInput,
  type SensusIssue,
} from "@/lib/sensus-form";
import type { TKey } from "@/lib/i18n/dictionaries/id";
import type { T } from "@/lib/i18n/translate";
import type { PassportMrzResult } from "@/lib/mrz";

const STEP_KEYS = ["sensus.stepBiodata", "sensus.stepStudentData", "sensus.stepContact"] as const;

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

// Label tiap field, dipakai untuk menyusun pesan error ("<label> wajib diisi").
const FIELD_LABEL_KEYS: Partial<Record<keyof SensusInput, TKey>> = {
  fullName: "sensus.fullName",
  passportNumber: "sensus.passportNumber",
  gender: "sensus.gender",
  passportExpiry: "sensus.passportExpiry",
  province: "sensus.province",
  birthDate: "sensus.birthDate",
  branch: "sensus.branch",
  studentStatus: "sensus.studentStatus",
  university: "sensus.university",
  degreeLevel: "sensus.degreeLevel",
  major: "sensus.major",
  fundingSource: "sensus.fundingSource",
  entryYear: "sensus.entryYear",
  graduationYear: "sensus.graduationYear",
  wechatId: "sensus.wechatId",
  phoneActive: "sensus.phoneActive",
  whatsappNumber: "sensus.whatsappNumber",
  studentCardUrl: "sensus.studentCardLabel",
  agreeTerms: "sensus.agreeTerms",
};

function optionLabel(t: T, value: string): string {
  const key = OPTION_KEYS[value];
  return key ? t(key) : value;
}

function issueMessage(t: T, issue: SensusIssue): string {
  switch (issue.kind) {
    case "wechat":
      return t("sensus.errWechat");
    case "phone":
      return t("sensus.errPhone");
    case "whatsapp":
      return t("sensus.errWhatsapp");
    case "year":
      return t("sensus.errYear");
    case "gradBeforeEntry":
      return t("sensus.errGradBeforeEntry");
    case "passportTaken":
      return t("sensus.errPassportTaken");
    case "studentCard":
      return t("sensus.errStudentCard");
    case "required":
      // Dua field ini punya pesan sendiri karena bukan "isian kosong" biasa:
      // satu unggahan berkas, satu kotak persetujuan.
      if (issue.field === "studentCardUrl") return t("sensus.errStudentCardRequired");
      if (issue.field === "agreeTerms") return t("sensus.errTermsRequired");
      return t("sensus.errRequired", { label: t(FIELD_LABEL_KEYS[issue.field] ?? "sensus.fullName") });
  }
}

function PhoneField({
  label,
  value,
  onChange,
  // Satu prefiks = kode negaranya dikunci (form pusat menulis "Nomor Telepon
  // Aktif (+86)" — memang harus nomor Tiongkok). Dua prefiks = pengisi memilih.
  prefixes,
  hint,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  prefixes: string[];
  hint: string;
  error?: string;
}) {
  const t = useT();
  const locked = prefixes.length === 1;
  const matched = prefixes.find((p) => value.startsWith(p));
  const prefix = locked ? prefixes[0] : matched ?? prefixes[0];
  const national = prefixes.reduce((acc, p) => acc.replace(p, ""), value).replace(/^0+/, "");
  const errorId = `sensus-err-phone-${label.replace(/\s+/g, "-")}`;

  function normalize(raw: string, withPrefix: string) {
    let n = raw.replace(/[^\d]/g, "").replace(/^0+/, "");
    // Buang kode negara yang telanjur diketik ulang di kolom nomor
    // ("+62" lalu "62812..." akan jadi "+6262812..." kalau tidak dipangkas).
    const bare = withPrefix.replace("+", "");
    if (n.startsWith(bare)) n = n.slice(bare.length);
    return withPrefix + n;
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">
        {label}
        <span className="text-error" aria-hidden="true"> *</span>
      </span>
      <div className="flex gap-2">
        {locked ? (
          <span
            className="bg-soft-gray rounded-md p-3 text-body-md shrink-0 text-on-surface-variant"
            aria-hidden="true"
          >
            {prefix}
          </span>
        ) : (
          <Select
            value={prefix}
            onChange={(e) => onChange(normalize(national, e.target.value))}
            aria-label={t("sensus.countryCodeAria")}
            className="shrink-0 sm:w-auto w-full"
          >
            {prefixes.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        )}
        <input
          type="tel"
          inputMode="numeric"
          value={national}
          onChange={(e) => onChange(normalize(e.target.value, prefix))}
          placeholder={prefix === "+86" ? "13712345678" : "85211849390"}
          aria-required="true"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="bg-soft-gray rounded-md p-3 text-body-md flex-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
        />
      </div>
      <span className="text-xs text-on-surface-variant">{hint}</span>
      {error && (
        <span id={errorId} className="text-xs text-error">
          {error}
        </span>
      )}
    </div>
  );
}

export function SensusWizard({
  initial,
  returnTo,
  branchOptions,
  universitiesByBranch,
}: {
  initial: Partial<SensusInput>;
  returnTo?: string;
  branchOptions: string[];
  // Kampus per cabang, sumber dropdown bertingkat Cabang → Universitas.
  universitiesByBranch: Record<string, string[]>;
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
    subscribeNewsletter: initial.subscribeNewsletter ?? false,
  });
  // Profil lama bisa menyimpan kampus yang tidak ada di daftar cabangnya (dulu
  // field ini teks bebas) - buka langsung dalam mode "Lainnya" supaya nilainya
  // tampil dan bisa disunting, bukan hilang diam-diam saat dropdown dirender.
  const [universityOther, setUniversityOther] = useState(() => {
    const uni = initial.university ?? "";
    const branch = initial.branch ?? "";
    return Boolean(uni) && !(universitiesByBranch[branch] ?? []).includes(uni);
  });
  const [issues, setIssues] = useState<SensusIssue[]>([]);
  const [pending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const stepRef = useRef<HTMLDivElement>(null);

  const branchUniversities = form.branch ? universitiesByBranch[form.branch] ?? [] : [];

  useEffect(() => {
    const first = stepRef.current?.querySelector<HTMLElement>("input, select, textarea, button");
    first?.focus();
  }, [step]);

  function update<K extends keyof SensusInput>(key: K, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }));
    // Begitu sebuah field disentuh, error-nya dilepas — biar tidak ada tulisan
    // merah yang bertahan padahal isiannya sudah dibetulkan.
    setIssues((prev) => prev.filter((i) => i.field !== key));
  }

    function applyPassportScan(result: PassportMrzResult) {
      const scannedFields: (keyof SensusInput)[] = [
        "fullName",
        "passportNumber",
        "gender",
        "passportExpiry",
        "province",
        "birthDate",
      ];
      setForm((current) => ({
        ...current,
        fullName: result.fullName,
        passportNumber: result.passportNumber,
        gender: result.gender || current.gender,
        passportExpiry: result.passportExpiry,
        province: result.province || current.province,
        birthDate: result.birthDate,
      }));
      setIssues((current) => current.filter((issue) => !scannedFields.includes(issue.field)));
    }

  // Ganti cabang = daftar kampusnya ikut ganti, jadi pilihan lama hampir pasti
  // tidak valid lagi di cabang baru dan harus dikosongkan.
  function updateBranch(value: string) {
    setForm((f) => ({ ...f, branch: value, university: "" }));
    setUniversityOther(false);
    setIssues((prev) => prev.filter((i) => i.field !== "branch" && i.field !== "university"));
  }

  function goNext() {
    setSaving(true);
    startTransition(async () => {
      const result = await saveSensusStep(form);
      setSaving(false);
      if ("error" in result) {
        // Paspor kembar = satu-satunya kegagalan simpan yang harus menahan
        // pengisi di tempat; nomornya harus dibetulkan sebelum apa pun bisa
        // tersimpan. Kegagalan lain (mis. sesi habis) tidak boleh menjebak
        // orang di tengah wizard - progresnya masih ada di state, biarkan maju.
        if (result.error === "passport_taken") {
          setIssues([{ field: "passportNumber", step: 0, kind: "passportTaken" }]);
          setStep(0);
          return;
        }
      } else {
        setLastSaved(new Date(result.savedAt));
      }
      setStep((s) => Math.min(STEP_KEYS.length - 1, s + 1));
    });
  }

  function handleSubmit() {
    // Divalidasi dulu di sini supaya pengisi form langsung dapat penanda merah
    // tanpa menunggu perjalanan ke server; server tetap memvalidasi ulang
    // dengan aturan yang sama (src/lib/sensus-form.ts).
    const local = validateSensus(form);
    if (local.length > 0) {
      setIssues(local);
      setStep(local[0].step);
      return;
    }
    setIssues([]);
    startTransition(async () => {
      const result = await submitSensusProfile(returnTo ?? null, form);
      // A successful submit redirects server-side and never returns here.
      if (result?.issues?.length) {
        setIssues(result.issues);
        setStep(result.issues[0].step);
      }
    });
  }

  const issueFor = (key: keyof SensusInput) => issues.find((i) => i.field === key);
  const errorFor = (key: keyof SensusInput) => {
    const issue = issueFor(key);
    return issue ? issueMessage(t, issue) : undefined;
  };

  const field = (
    label: string,
    key: keyof SensusInput,
    opts?: {
      type?: string;
      hint?: string;
      options?: string[];
      required?: boolean;
      placeholder?: string;
      disabled?: boolean;
      emptyLabel?: string;
      onChange?: (value: string) => void;
    }
  ) => {
    const id = `sensus-${key}`;
    const hintId = `sensus-hint-${key}`;
    const errorId = `sensus-err-${key}`;
    const error = errorFor(key);
    const describedBy = [opts?.hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ");
    const onChange = opts?.onChange ?? ((value: string) => update(key, value));
    return (
      <div className="flex flex-col gap-2">
        <label htmlFor={id} className="text-label-caps uppercase tracking-wide text-on-surface-variant">
          {label}
          {opts?.required && <span className="text-error" aria-hidden="true"> *</span>}
        </label>
        {opts?.options ? (
          <Select
            id={id}
            value={form[key] as string}
            onChange={(e) => onChange(e.target.value)}
            disabled={opts.disabled}
            aria-required={opts.required || undefined}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy || undefined}
            className="w-full"
            placeholder={opts.emptyLabel ?? t("sensus.selectPlaceholder", { label })}
          >
            {opts.options.map((o) => (
              <option key={o} value={o}>
                {optionLabel(t, o)}
              </option>
            ))}
          </Select>
        ) : (
          <input
            id={id}
            type={opts?.type ?? "text"}
            value={form[key] as string}
            onChange={(e) => onChange(e.target.value)}
            placeholder={opts?.placeholder}
            disabled={opts?.disabled}
            aria-required={opts?.required || undefined}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy || undefined}
            className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container disabled:opacity-60"
          />
        )}
        {opts?.hint && (
          <span id={hintId} className="text-xs text-on-surface-variant">
            {opts.hint}
          </span>
        )}
        {error && (
          <span id={errorId} className="text-xs text-error">
            {error}
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
        {/* Urutan field tiap langkah sengaja mengikuti form PPI Tiongkok pusat,
            supaya pengurus yang memindahkan data bisa membaca dua form itu
            berdampingan tanpa loncat-loncat. */}
        {step === 0 && (
          <fieldset className="contents">
            <legend className="sr-only">{t(STEP_KEYS[0])}</legend>
              <PassportScanner onResult={applyPassportScan} />
            {field(t("sensus.fullName"), "fullName", { required: true })}
            {field(t("sensus.passportNumber"), "passportNumber", {
              required: true,
              hint: t("sensus.passportHint"),
              placeholder: "A12345678",
            })}
            {field(t("sensus.gender"), "gender", { options: GENDER_OPTIONS, required: true })}
            {field(t("sensus.passportExpiry"), "passportExpiry", { type: "date", required: true })}
            {field(t("sensus.province"), "province", {
              options: [...INDONESIA_PROVINCES],
              required: true,
              hint: t("sensus.provinceHint"),
            })}
            {field(t("sensus.birthDate"), "birthDate", { type: "date", required: true })}
          </fieldset>
        )}
        {step === 1 && (
          <fieldset className="contents">
            <legend className="sr-only">{t(STEP_KEYS[1])}</legend>
            {field(t("sensus.branch"), "branch", {
              options: branchOptions,
              required: true,
              onChange: updateBranch,
            })}
            {field(t("sensus.studentStatus"), "studentStatus", { options: STUDENT_STATUS_OPTIONS, required: true })}
            {/* Universitas terkunci sampai cabang dipilih - daftar kampusnya
                memang diambil per cabang, sama seperti form pusat. */}
            {universityOther
              ? field(t("sensus.university"), "university", {
                  required: true,
                  placeholder: "Nanjing Xiaozhuang University",
                  hint: t("sensus.universityOtherHint"),
                })
              : field(t("sensus.university"), "university", {
                  required: true,
                  disabled: !form.branch,
                  options: [...branchUniversities, UNIVERSITY_OTHER],
                  emptyLabel: form.branch
                    ? t("sensus.selectPlaceholder", { label: t("sensus.university") })
                    : t("sensus.universityLockedHint"),
                  hint: form.branch && branchUniversities.length === 0 ? t("sensus.universityEmptyHint") : undefined,
                  onChange: (value) => {
                    if (value === UNIVERSITY_OTHER) {
                      setUniversityOther(true);
                      update("university", "");
                    } else {
                      update("university", value);
                    }
                  },
                })}
            {universityOther && (
              <button
                type="button"
                onClick={() => {
                  setUniversityOther(false);
                  update("university", "");
                }}
                className="self-start -mt-4 text-xs text-secondary hover:text-on-background underline rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
              >
                {t("sensus.universityBackToList")}
              </button>
            )}
            {field(t("sensus.degreeLevel"), "degreeLevel", { options: DEGREE_OPTIONS, required: true })}
            {field(t("sensus.major"), "major", {
              required: true,
              placeholder: "Computer Science",
            })}
            {field(t("sensus.fundingSource"), "fundingSource", { options: FUNDING_OPTIONS, required: true })}
            {field(t("sensus.entryYear"), "entryYear", { type: "number", required: true, placeholder: "2024" })}
            {field(t("sensus.graduationYear"), "graduationYear", {
              type: "number",
              required: true,
              placeholder: "2028",
            })}
            <div className="flex flex-col gap-2">
              <ImageUploadCropper
                folder="sensus"
                label={t("sensus.studentCardLabel")}
                required
                value={form.studentCardUrl}
                onValueChange={(url) => update("studentCardUrl", url)}
              />
              <span className="text-xs text-on-surface-variant">{t("sensus.studentCardHint")}</span>
              {errorFor("studentCardUrl") && (
                <span className="text-xs text-error">{errorFor("studentCardUrl")}</span>
              )}
            </div>
          </fieldset>
        )}
        {step === 2 && (
          <fieldset className="contents">
            <legend className="sr-only">{t(STEP_KEYS[2])}</legend>
            {field(t("sensus.wechatId"), "wechatId", {
              required: true,
              placeholder: "Xevuin12",
              hint: t("sensus.wechatHint"),
            })}
            <PhoneField
              label={t("sensus.phoneActive")}
              value={form.phoneActive}
              onChange={(v) => update("phoneActive", v)}
              prefixes={["+86"]}
              hint={t("sensus.phoneActiveHint")}
              error={errorFor("phoneActive")}
            />
            <PhoneField
              label={t("sensus.whatsappNumber")}
              value={form.whatsappNumber}
              onChange={(v) => update("whatsappNumber", v)}
              prefixes={["+62", "+86"]}
              hint={t("sensus.whatsappHint")}
              error={errorFor("whatsappNumber")}
            />
            <div className="flex flex-col gap-2">
              <CheckField
                name="agreeTerms"
                checked={form.agreeTerms}
                onChange={(e) => update("agreeTerms", e.target.checked)}
                aria-required="true"
                aria-invalid={issueFor("agreeTerms") ? true : undefined}
                label={
                  <>
                    {t("sensus.agreeTerms")}
                    <span className="text-error" aria-hidden="true"> *</span>
                  </>
                }
              />
              {errorFor("agreeTerms") && <span className="text-xs text-error">{errorFor("agreeTerms")}</span>}
            </div>
            {/* Satu-satunya field opsional di form pusat. */}
            <CheckField
              name="subscribeNewsletter"
              checked={form.subscribeNewsletter}
              onChange={(e) => update("subscribeNewsletter", e.target.checked)}
              label={
                <>
                  {t("sensus.newsletter")}{" "}
                  <span className="text-xs text-on-surface-variant">({t("sensus.optional")})</span>
                </>
              }
            />
          </fieldset>
        )}
      </div>

      {issues.length > 0 && (
        <div
          role="alert"
          aria-live="assertive"
          className="flex items-start gap-3 bg-error-container/40 border-l-4 border-error rounded-r-lg p-4 mb-6"
        >
          <AlertTriangle className="text-error shrink-0 mt-0.5" size={18} />
          <div>
            <p className="text-body-md text-on-background">{t("sensus.errFixFields", { n: issues.length })}</p>
            {/* Error dari langkah lain tidak kelihatan di layar ini, jadi
                disebutkan namanya supaya pengisi tahu harus mundur ke mana. */}
            {issues.some((i) => i.step !== step) && (
              <p className="text-xs text-on-surface-variant mt-1">
                {issues
                  .filter((i) => i.step !== step)
                  .map((i) => `${t(STEP_KEYS[i.step])}: ${t(FIELD_LABEL_KEYS[i.field] ?? "sensus.fullName")}`)
                  .join(", ")}
              </p>
            )}
          </div>
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
