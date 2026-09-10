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
// `branchOptions` = daftar kota cabang PPI (regional_branches), diteruskan dari
// layout supaya field "Asal Kota" di sini persis dropdown yang sama dengan
// /sensus — bukan teks bebas yang dulu menghasilkan isian ngawur ("MALANG",
// "kab.sleman", dst.).
type Props = {
  value: OnboardingCensus;
  onChange: (data: OnboardingCensus) => void;
  branchOptions: string[];
};

const fieldCls =
  "bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container";

export function OnboardingCensusSection({ value, onChange, branchOptions }: Props) {
  const t = useT();
  const set = (key: keyof OnboardingCensus, v: string) => onChange({ ...value, [key]: v });

  // Semua opsional — pengisi boleh melewati atau mengisi sebagian; sisanya
  // dilengkapi nanti di /sensus. fullName + branch dirender eksplisit di bawah
  // (branch = dropdown), sisanya lewat map ini.
  const textFields: {
    key: keyof OnboardingCensus;
    label: string;
    type?: string;
    placeholder?: string;
    wide?: boolean;
    autoComplete?: string;
  }[] = [
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
        <label className="flex flex-col gap-1.5">
          <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">{t("sensus.fullName")}</span>
          <input
            type="text"
            value={value.fullName ?? ""}
            onChange={(e) => set("fullName", e.target.value)}
            placeholder={t("sensus.fullName")}
            autoComplete="name"
            className={fieldCls}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">{t("sensus.branch")}</span>
          <select
            value={value.branch ?? ""}
            onChange={(e) => set("branch", e.target.value)}
            className={`${fieldCls} pp-select`}
          >
            <option value="">—</option>
            {branchOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <span className="text-label-caps text-on-surface-variant normal-case">{t("sensus.branchHint")}</span>
        </label>

        {textFields.map((f) => (
          <label key={f.key} className={`flex flex-col gap-1.5 ${f.wide ? "sm:col-span-2" : ""}`}>
            <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">{f.label}</span>
            <input
              type={f.type ?? "text"}
              value={value[f.key] ?? ""}
              onChange={(e) => set(f.key, e.target.value)}
              placeholder={f.placeholder}
              autoComplete={f.autoComplete}
              className={fieldCls}
            />
          </label>
        ))}
      </div>
      <p className="text-xs text-on-surface-variant mt-3">{t("onboarding.censusNote")}</p>
    </fieldset>
  );
}
