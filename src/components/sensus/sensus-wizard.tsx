"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ChevronRight, ChevronLeft, Check, AlertTriangle, Loader2 } from "lucide-react";
import { submitSensusProfile, saveSensusStep, type SensusInput } from "@/app/actions/sensus";
import { ImageUploadCropper } from "@/components/upload/image-upload-cropper";

const STEPS = ["Biodata", "Data Mahasiswa", "Kontak"] as const;

const GENDER_OPTIONS = ["Laki-Laki", "Perempuan"];
const STUDENT_STATUS_OPTIONS = ["Mahasiswa Aktif", "Mahasiswa Non-Aktif", "Cuti", "Lulus"];
const DEGREE_OPTIONS = ["D3", "S1", "S2", "S3", "Sekolah Bahasa", "Lainnya"];
const FUNDING_OPTIONS = ["Self-funded", "Partial Scholarship", "Full Scholarship"];

export function SensusWizard({
  initial,
  returnTo,
  branchOptions,
}: {
  initial: Partial<SensusInput>;
  returnTo?: string;
  branchOptions: string[];
}) {
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
      setStep((s) => Math.min(STEPS.length - 1, s + 1));
    });
  }

  function handleSubmit() {
    setSubmitError(null);
    startTransition(async () => {
      const result = await submitSensusProfile(returnTo ?? null, form);
      // A successful submit redirects server-side and never returns here.
      if (result && "error" in result) {
        if (result.error === "student_card_required") {
          setSubmitError("Kartu Tanda Mahasiswa wajib diunggah sebelum sensus bisa disimpan sebagai lengkap.");
          setStep(1);
        } else if (result.error === "terms_required") {
          setSubmitError("Kamu harus menyetujui syarat, ketentuan, dan kebijakan privasi.");
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
            <option value="">Pilih {label.toLowerCase()}</option>
            {opts.options.map((o) => (
              <option key={o} value={o}>
                {o}
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
        Langkah {step + 1} dari {STEPS.length}: {STEPS[step]}
      </p>
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
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
              {s}
            </span>
            {i < STEPS.length - 1 && <div className="flex-1 h-px bg-outline-variant" />}
          </div>
        ))}
      </div>

      <div ref={stepRef} className="flex flex-col gap-6 mb-10">
        {step === 0 && (
          <fieldset className="contents">
            <legend className="sr-only">{STEPS[0]}</legend>
            {field("Nama Lengkap", "fullName", { required: true })}
            {field("Nomor Paspor", "passportNumber", {
              required: true,
              hint: "Sesuai paspor, contoh: X3XXXX18",
              placeholder: "X3XXXX18",
            })}
            {field("Jenis Kelamin", "gender", { options: GENDER_OPTIONS, required: true })}
            {field("Tanggal Lahir", "birthDate", { type: "date", required: true })}
            {field("Asal Provinsi", "province", {
              required: true,
              hint: "Provinsi asal di Indonesia, contoh: Banten",
              placeholder: "Banten",
            })}
            {field("Tanggal Maksimal Berlaku Paspor", "passportExpiry", { type: "date", required: true })}
          </fieldset>
        )}
        {step === 1 && (
          <fieldset className="contents">
            <legend className="sr-only">{STEPS[1]}</legend>
            {field("Asal Cabang", "branch", { options: branchOptions, required: true })}
            {field("Status Mahasiswa", "studentStatus", { options: STUDENT_STATUS_OPTIONS, required: true })}
            {field("Nama Universitas (dalam Bahasa Inggris)", "university", {
              required: true,
              placeholder: "Nanjing Xiaozhuang University",
            })}
            {field("Jenjang Pendidikan", "degreeLevel", { options: DEGREE_OPTIONS, required: true })}
            {field("Jurusan (dalam Bahasa Inggris)", "major", {
              required: true,
              placeholder: "Software Engineer",
            })}
            {field("Sumber Pembiayaan Pendidikan", "fundingSource", { options: FUNDING_OPTIONS, required: true })}
            {field("Tahun Masuk", "entryYear", { type: "number", required: true, placeholder: "2025" })}
            {field("Perkiraan Tahun Kelulusan", "graduationYear", {
              type: "number",
              required: true,
              placeholder: "2027",
            })}
            <ImageUploadCropper
              folder="sensus"
              label="Kartu Tanda Mahasiswa"
              required
              value={form.studentCardUrl}
              onValueChange={(url) => update("studentCardUrl", url)}
            />
          </fieldset>
        )}
        {step === 2 && (
          <fieldset className="contents">
            <legend className="sr-only">{STEPS[2]}</legend>
            {field("WeChat ID", "wechatId", { required: true, placeholder: "Xevuin12" })}
            {field("Nomor Telepon Aktif (+86)", "phoneActive", {
              type: "tel",
              required: true,
              placeholder: "+8615851866267",
            })}
            {field("Nomor WhatsApp (+62/+86)", "whatsappNumber", {
              type: "tel",
              required: true,
              placeholder: "+6285211849390",
            })}
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
                Saya menyetujui syarat dan ketentuan serta kebijakan privasi.
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
            <ChevronLeft size={16} /> Sebelumnya
          </button>
          <span aria-live="polite" className="flex items-center gap-2">
            {lastSaved && !saving && (
              <span className="flex items-center gap-1 text-xs text-on-surface-variant">
                <Check size={12} className="text-primary-container" />
                Tersimpan {lastSaved.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            {saving && <span className="text-xs text-on-surface-variant">Menyimpan progres...</span>}
          </span>
        </div>

        {step < STEPS.length - 1 ? (
          <button
            onClick={goNext}
            disabled={pending}
            className="flex items-center gap-1 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Selanjutnya <ChevronRight size={16} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={pending}
            className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors disabled:opacity-60 flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {pending && <Loader2 />}
            {pending ? "Menyimpan..." : "Simpan Sensus"}
          </button>
        )}
      </div>
    </div>
  );
}
