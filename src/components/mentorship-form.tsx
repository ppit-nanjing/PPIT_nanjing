"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { applyForMentorship } from "@/app/actions/mentorship";
import { useT } from "@/lib/i18n/client";
import { Select } from "@/components/console/form";

const INDUSTRIES = [
  { value: "Teknologi & Software", key: "career.mentorship.industry.tech" },
  { value: "Keuangan & Perbankan", key: "career.mentorship.industry.finance" },
  { value: "Teknik & Manufaktur", key: "career.mentorship.industry.engineering" },
  { value: "Konsultasi & Strategi Bisnis", key: "career.mentorship.industry.consulting" },
  { value: "Seni Kreatif & Desain", key: "career.mentorship.industry.creative" },
  { value: "Akademia & Riset", key: "career.mentorship.industry.academia" },
] as const;

const STEPS = ["career.mentorship.formStep1", "career.mentorship.formStep2"] as const;

export function MentorshipForm() {
  const t = useT();
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
            <span className={`text-label-caps ${i === step ? "text-on-background font-medium" : "text-on-surface-variant"}`}>{t(s)}</span>
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="flex flex-col gap-6">
          <label className="flex flex-col gap-2">
            <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">{t("career.mentorship.fieldLabel")}</span>
            <Select
              value={preferredField}
              onChange={(e) => setPreferredField(e.target.value)}
              className="w-full"
              placeholder={t("career.mentorship.fieldPlaceholder")}
            >
              {INDUSTRIES.map((i) => (
                <option key={i.value} value={i.value}>
                  {t(i.key)}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">{t("career.mentorship.backgroundLabel")}</span>
            <textarea
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              rows={4}
              placeholder={t("career.mentorship.backgroundPlaceholder")}
              className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container resize-none"
            />
          </label>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-1 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
            >
              {t("career.mentorship.next")} <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-6">
          <label className="flex flex-col gap-2">
            <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">
              {t("career.mentorship.motivationLabel")}
            </span>
            <textarea
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              rows={5}
              required
              placeholder={t("career.mentorship.motivationPlaceholder")}
              className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container resize-none"
            />
          </label>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="flex items-center gap-1 text-label-caps text-secondary hover:text-on-background transition-colors"
            >
              <ChevronLeft size={16} /> {t("career.mentorship.prev")}
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
            >
              {t("career.mentorship.submit")} <CheckCircle2 size={16} />
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
