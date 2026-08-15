"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { applyForMentorship } from "@/app/actions/mentorship";

const INDUSTRIES = [
  "Teknologi & Software",
  "Keuangan & Perbankan",
  "Teknik & Manufaktur",
  "Konsultasi & Strategi Bisnis",
  "Seni Kreatif & Desain",
  "Akademia & Riset",
];

const STEPS = ["Bidang & Latar Belakang", "Motivasi"] as const;

export function MentorshipForm() {
  const [step, setStep] = useState(0);
  const [preferredField, setPreferredField] = useState("");
  const [background, setBackground] = useState("");
  const [motivation, setMotivation] = useState("");

  return (
    <form action={applyForMentorship} className="flex flex-col gap-6">
      <input type="hidden" name="preferredField" value={preferredField} />
      <input type="hidden" name="background" value={background} />
      <input type="hidden" name="motivation" value={motivation} />

      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex-1 flex flex-col gap-2">
            <div className={`h-2 rounded-full transition-colors ${i <= step ? "bg-primary-container" : "bg-surface-container-low"}`} />
            <span className={`text-label-caps ${i === step ? "text-on-background font-medium" : "text-on-surface-variant"}`}>{s}</span>
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="flex flex-col gap-6">
          <label className="flex flex-col gap-2">
            <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Bidang yang Diminati</span>
            <select
              value={preferredField}
              onChange={(e) => setPreferredField(e.target.value)}
              className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container"
            >
              <option value="">Pilih bidang industri</option>
              {INDUSTRIES.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Latar Belakang Singkat</span>
            <textarea
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              rows={4}
              placeholder="Ceritakan pengalaman akademik/organisasi/kerja yang relevan"
              className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container resize-none"
            />
          </label>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-1 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
            >
              Selanjutnya <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-6">
          <label className="flex flex-col gap-2">
            <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">
              Motivasi Mengikuti Mentorship *
            </span>
            <textarea
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              rows={5}
              required
              placeholder="Apa yang ingin kamu capai lewat program ini?"
              className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container resize-none"
            />
          </label>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="flex items-center gap-1 text-label-caps text-secondary hover:text-on-background transition-colors"
            >
              <ChevronLeft size={16} /> Sebelumnya
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
            >
              Kirim Pendaftaran <CheckCircle2 size={16} />
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
