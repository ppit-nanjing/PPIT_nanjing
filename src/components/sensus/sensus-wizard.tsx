"use client";

import { useState, useTransition } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { submitSensusProfile, type SensusInput } from "@/app/actions/sensus";

const STEPS = ["Data Diri", "Akademik", "Kontak Darurat"] as const;

export function SensusWizard({ initial }: { initial: Partial<SensusInput> }) {
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
  });
  const [pending, startTransition] = useTransition();

  function update<K extends keyof SensusInput>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit() {
    startTransition(() => submitSensusProfile(form));
  }

  const field = (label: string, key: keyof SensusInput, type = "text") => (
    <label className="flex flex-col gap-2">
      <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">{label}</span>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => update(key, e.target.value)}
        className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container"
      />
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
            {field("Jenis Kelamin", "gender")}
            {field("Tanggal Lahir", "birthDate", "date")}
            {field("Kota Domisili di Tiongkok", "cityInChina")}
            {field("Tanggal Kedatangan di Tiongkok", "arrivalDate", "date")}
          </>
        )}
        {step === 1 && (
          <>
            {field("Universitas", "university")}
            {field("Program Studi", "program")}
            {field("Jenjang (S1/S2/S3)", "degreeLevel")}
            {field("Jenis Visa", "visaType")}
            {field("Jenis Beasiswa", "scholarshipType")}
          </>
        )}
        {step === 2 && (
          <>
            {field("Nama Kontak Darurat", "emergencyContactName")}
            {field("No. Telepon Kontak Darurat", "emergencyContactPhone")}
          </>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="flex items-center gap-1 text-label-caps text-secondary hover:text-on-background disabled:opacity-30 transition-colors"
        >
          <ChevronLeft size={16} /> Sebelumnya
        </button>

        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
            className="flex items-center gap-1 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
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
