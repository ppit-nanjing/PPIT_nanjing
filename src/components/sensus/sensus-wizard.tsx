"use client";

import { useState, useTransition } from "react";
import { ChevronRight, ChevronLeft, Check, AlertTriangle } from "lucide-react";
import { submitSensusProfile, saveSensusStep, type SensusInput } from "@/app/actions/sensus";
import { ImageUploadCropper } from "@/components/upload/image-upload-cropper";

const STEPS = ["Data Diri", "Akademik", "Kontak Darurat"] as const;

const GENDER_OPTIONS = ["Laki-Laki", "Perempuan"];
const DEGREE_OPTIONS = ["D3", "S1", "S2", "S3", "Sekolah Bahasa"];
const SCHOLARSHIP_OPTIONS = ["Self-funded", "Partial Scholarship", "Full Scholarship"];

export function SensusWizard({ initial, returnTo }: { initial: Partial<SensusInput>; returnTo?: string }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<SensusInput>({
    gender: initial.gender ?? "",
    birthDate: initial.birthDate ?? "",
    university: initial.university ?? "",
    program: initial.program ?? "",
    degreeLevel: initial.degreeLevel ?? "",
    cityInChina: initial.cityInChina ?? "",
    arrivalDate: initial.arrivalDate ?? "",
    visaType: initial.visaType ?? "",
    scholarshipType: initial.scholarshipType ?? "",
    emergencyContactName: initial.emergencyContactName ?? "",
    emergencyContactPhone: initial.emergencyContactPhone ?? "",
    photoUrl: initial.photoUrl ?? "",
  });
  const [pending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function update<K extends keyof SensusInput>(key: K, value: string) {
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
      if (result && "error" in result && result.error === "photo_required") {
        setSubmitError("Foto profil wajib diunggah sebelum sensus bisa disimpan sebagai lengkap.");
        setStep(0);
      }
    });
  }

  const field = (
    label: string,
    key: keyof SensusInput,
    opts?: { type?: string; hint?: string; options?: string[] }
  ) => (
    <label className="flex flex-col gap-2">
      <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">{label}</span>
      {opts?.options ? (
        <select
          value={form[key]}
          onChange={(e) => update(key, e.target.value)}
          className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container"
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
          type={opts?.type ?? "text"}
          value={form[key]}
          onChange={(e) => update(key, e.target.value)}
          className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container"
        />
      )}
      {opts?.hint && <span className="text-xs text-on-surface-variant">{opts.hint}</span>}
    </label>
  );

  return (
    <div>
      <div className="flex items-center gap-2 mb-10">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-label-caps font-semibold shrink-0 ${
                i <= step ? "bg-primary-container text-on-primary" : "bg-surface-container-low text-on-surface-variant"
              }`}
            >
              {i + 1}
            </div>
            <span
              className={`text-label-caps hidden sm:block ${i === step ? "text-on-background font-medium" : "text-on-surface-variant"}`}
            >
              {s}
            </span>
            {i < STEPS.length - 1 && <div className="flex-1 h-px bg-outline-variant" />}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-6 mb-10">
        {step === 0 && (
          <>
            <ImageUploadCropper
              folder="sensus"
              label="Foto Profil (bukti mahasiswa aktif di Tiongkok)"
              required
              aspect={1}
              value={form.photoUrl}
              onValueChange={(url) => update("photoUrl", url)}
            />
            {field("Jenis Kelamin", "gender", { options: GENDER_OPTIONS })}
            {field("Tanggal Lahir", "birthDate", { type: "date" })}
            {field("Kota Domisili di Tiongkok", "cityInChina", {
              hint: "Kota tempat kamu tinggal saat ini, bukan kota kampus jika berbeda.",
            })}
            {field("Tanggal Kedatangan di Tiongkok", "arrivalDate", { type: "date" })}
          </>
        )}
        {step === 1 && (
          <>
            {field("Universitas", "university")}
            {field("Program Studi", "program")}
            {field("Jenjang", "degreeLevel", { options: DEGREE_OPTIONS })}
            {field("Jenis Visa", "visaType")}
            {field("Sumber Pembiayaan", "scholarshipType", {
              options: SCHOLARSHIP_OPTIONS,
              hint: "Pilih jenis beasiswa atau pendanaan mandiri.",
            })}
          </>
        )}
        {step === 2 && (
          <>
            {field("Nama Kontak Darurat", "emergencyContactName", {
              hint: "Keluarga atau kerabat yang bisa dihubungi dalam keadaan darurat.",
            })}
            {field("No. Telepon Kontak Darurat", "emergencyContactPhone", { type: "tel" })}
          </>
        )}
      </div>

      {submitError && (
        <div className="flex items-start gap-3 bg-error-container/40 border-l-4 border-error rounded-r-lg p-4 mb-6">
          <AlertTriangle className="text-error shrink-0 mt-0.5" size={18} />
          <p className="text-body-md text-on-background">{submitError}</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="flex items-center gap-1 text-label-caps text-secondary hover:text-on-background disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={16} /> Sebelumnya
          </button>
          {lastSaved && !saving && (
            <span className="flex items-center gap-1 text-xs text-on-surface-variant">
              <Check size={12} className="text-primary-container" />
              Tersimpan {lastSaved.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          {saving && <span className="text-xs text-on-surface-variant">Menyimpan progres...</span>}
        </div>

        {step < STEPS.length - 1 ? (
          <button
            onClick={goNext}
            disabled={pending}
            className="flex items-center gap-1 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors disabled:opacity-60"
          >
            Selanjutnya <ChevronRight size={16} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={pending}
            className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors disabled:opacity-60"
          >
            {pending ? "Menyimpan..." : "Simpan Sensus"}
          </button>
        )}
      </div>
    </div>
  );
}
