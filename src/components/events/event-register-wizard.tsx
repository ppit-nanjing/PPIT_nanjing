"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Ticket, ArrowLeft, ArrowRight } from "lucide-react";
import { useT } from "@/lib/i18n/client";

export type WizardStep = { id: string; title: string; content: ReactNode };

const btnPrimary =
  "flex-1 inline-flex items-center justify-center gap-2 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-4 rounded-md hover:bg-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low";
const btnGhost =
  "inline-flex items-center justify-center gap-2 border border-outline-variant text-on-background text-label-caps uppercase tracking-wide px-5 py-4 rounded-md hover:bg-surface-container-low transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container";

/**
 * Form pendaftaran acara bertahap (per-section + tombol Lanjut), à la Google
 * Form. Tetap SATU <form> yang di-submit sekali ke server action - jadi
 * registerForEvent tidak berubah, ia tetap menerima satu FormData berisi semua
 * field. Wizard cuma mengatur section mana yang tampak + validasi per-step.
 *
 * Field `required` di step non-aktif dilepas sementara (disimpan di data-attr):
 * browser menolak submit form dengan kontrol wajib yang `hidden` ("An invalid
 * form control is not focusable"). Dipasang lagi begitu step-nya aktif.
 */
export function EventRegisterWizard({
  action,
  steps,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  steps: WizardStep[];
  submitLabel: string;
}) {
  const t = useT();
  const [step, setStep] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const last = steps.length - 1;

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    form.querySelectorAll<HTMLElement>("[data-wizard-step]").forEach((container, i) => {
      container
        .querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea")
        .forEach((el) => {
          if (i === step) {
            if (el.dataset.wizReq === "1") {
              el.required = true;
              delete el.dataset.wizReq;
            }
          } else if (el.required) {
            el.required = false;
            el.dataset.wizReq = "1";
          }
        });
    });
  }, [step]);

  function currentStepValid() {
    const container = formRef.current?.querySelector<HTMLElement>(`[data-wizard-step="${step}"]`);
    if (!container) return true;
    const controls = [
      ...container.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea"),
    ];
    const invalid = controls.find((el) => !el.checkValidity());
    if (invalid) {
      invalid.reportValidity();
      return false;
    }
    return true;
  }

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-4 text-left">
      {steps.length > 1 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-label-caps uppercase tracking-wide text-on-surface-variant">
            <span>{steps[step]?.title}</span>
            <span>
              {step + 1} / {steps.length}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-surface-container-low overflow-hidden">
            <div
              className="h-full rounded-full bg-primary-container transition-all duration-300 motion-reduce:transition-none"
              style={{ width: `${((step + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {steps.map((s, i) => (
        <div key={s.id} data-wizard-step={i} className={i === step ? "flex flex-col gap-3" : "hidden"}>
          {s.content}
        </div>
      ))}

      <div className="flex gap-3">
        {step > 0 && (
          <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} className={btnGhost}>
            <ArrowLeft size={16} aria-hidden="true" /> {t("events.wizardBack")}
          </button>
        )}
        {step < last ? (
          <button
            type="button"
            onClick={() => {
              if (currentStepValid()) setStep((s) => Math.min(last, s + 1));
            }}
            className={btnPrimary}
          >
            {t("events.wizardNext")} <ArrowRight size={16} aria-hidden="true" />
          </button>
        ) : (
          <button type="submit" className={btnPrimary}>
            <Ticket size={16} aria-hidden="true" /> {submitLabel}
          </button>
        )}
      </div>
    </form>
  );
}
