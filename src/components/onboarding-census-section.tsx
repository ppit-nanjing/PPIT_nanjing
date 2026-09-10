"use client";

import { useT } from "@/lib/i18n/client";
import type { SensusInput } from "@/lib/sensus-form";

// Hanya field yang dikumpulkan modal onboarding — harus cocok dengan
// ONBOARDING_SENSUS_FIELDS di src/app/actions/sensus.ts.
export type OnboardingCensus = Partial<
  Pick<SensusInput, "fullName" | "branch" | "activeEmail" | "wechatId" | "whatsappNumber">
>;

// Controlled: state-nya dipegang OnboardingModal supaya nilai yang disimpan
// selalu = apa yang terlihat di layar (tidak ada sinkronisasi terpisah).
type Props = {
  value: OnboardingCensus;
  onChange: (data: OnboardingCensus) => void;
};

const inputCls =
  "bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container";

export function OnboardingCensusSection({ value, onChange }: Props) {
  const t = useT();

  // Semua opsional — pengisi boleh melewati atau mengisi sebagian; sisanya
  // dilengkapi nanti di /sensus.
  const fields: {
    key: keyof OnboardingCensus;
    label: string;
    type?: string;
    placeholder?: string;
    wide?: boolean;
    autoComplete?: string;
  }[] = [
    { key: "fullName", label: t("sensus.fullName"), placeholder: t("sensus.fullName"), autoComplete: "name" },
    { key: "branch", label: t("sensus.branch"), placeholder: "Nanjing", autoComplete: "off" },
    { key: "activeEmail", label: t("sensus.activeEmail"), type: "email", placeholder: "nama@gmail.com", wide: true, autoComplete: "email" },
    { key: "wechatId", label: t("sensus.wechatId"), placeholder: "Xevuin12", autoComplete: "off" },
    { key: "whatsappNumber", label: t("sensus.whatsappNumber"), type: "tel", placeholder: "+62 8xx xxxx xxxx", wide: true, autoComplete: "tel" },
  ];

  return (
    <fieldset className="border border-outline-variant rounded-lg p-4">
      <legend className="px-1.5 text-label-caps uppercase tracking-wide text-on-surface-variant">
        {t("onboarding.censusHeading")}
      </legend>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {fields.map((f) => (
          <label key={f.key} className={`flex flex-col gap-1.5 ${f.wide ? "sm:col-span-2" : ""}`}>
            <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">{f.label}</span>
            <input
              type={f.type ?? "text"}
              value={value[f.key] ?? ""}
              onChange={(e) => onChange({ ...value, [f.key]: e.target.value })}
              placeholder={f.placeholder}
              autoComplete={f.autoComplete}
              className={inputCls}
            />
          </label>
        ))}
      </div>
      <p className="text-xs text-on-surface-variant mt-3">{t("onboarding.censusNote")}</p>
    </fieldset>
  );
}
