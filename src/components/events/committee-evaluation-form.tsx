"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { submitCommitteeEvaluation, type CommitteeEvaluationFormState } from "@/app/actions/committee-evaluation";
import { useT } from "@/lib/i18n/client";
import { COMMITTEE_EVAL_ASPECTS, COMMITTEE_EVAL_TEXT, COMMITTEE_EVAL_RATING_MAX } from "@/lib/committee-evaluation";

const CARD = "bg-surface-container-lowest border border-outline-variant rounded-xl p-5 sm:p-6 flex flex-col gap-5";
const LABEL = "text-label-caps uppercase tracking-wide text-on-surface-variant";
const TEXTAREA =
  "w-full rounded-md border border-outline-variant bg-surface-container-low px-3 py-2.5 text-body-md text-on-background focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background resize-y min-h-[96px]";
const BTN =
  "inline-flex items-center justify-center gap-2 rounded-md px-6 py-3 text-label-caps uppercase tracking-wide transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background";

// Skala 1–5, satu pertanyaan kolektif. Radio native di balik kotak angka —
// keyboard, pembaca layar, dan `required` bawaan browser tetap bekerja
// (pola sama dengan RatingScale di event-evaluation-form).
function Scale5({
  name,
  legend,
  hint,
  lowLabel,
  highLabel,
}: {
  name: string;
  legend: string;
  hint?: string;
  lowLabel: string;
  highLabel: string;
}) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-body-md font-semibold text-on-background">
        {legend} <span className="text-primary-container" aria-hidden="true">*</span>
      </legend>
      {hint && <p className="text-body-sm text-on-surface-variant -mt-2">{hint}</p>}
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: COMMITTEE_EVAL_RATING_MAX }, (_, i) => i + 1).map((n) => (
          <label key={n} className="cursor-pointer">
            <input type="radio" name={name} value={n} required className="peer sr-only" />
            <span className="flex h-10 w-10 items-center justify-center rounded-md border border-outline-variant bg-surface-container-low text-body-md text-on-surface-variant transition-colors peer-checked:border-primary-container peer-checked:bg-primary-container peer-checked:text-on-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary-container peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background">
              {n}
            </span>
          </label>
        ))}
      </div>
      <div className="flex max-w-[16rem] justify-between text-label-caps text-on-surface-variant">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </fieldset>
  );
}

function TextAreaField({
  name,
  label,
  optional,
  optionalLabel,
}: {
  name: string;
  label: string;
  optional: boolean;
  optionalLabel: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-body-md font-semibold text-on-background">
        {label}{" "}
        {optional ? (
          <span className="text-body-sm font-normal text-on-surface-variant">({optionalLabel})</span>
        ) : (
          <span className="text-primary-container" aria-hidden="true">*</span>
        )}
      </span>
      <textarea
        name={name}
        maxLength={2000}
        rows={3}
        required={!optional}
        aria-required={!optional}
        aria-label={`${label}${optional ? ` (${optionalLabel})` : ""}`}
        className={TEXTAREA}
      />
    </label>
  );
}

// Form evaluasi panitia per-acara. Pengisi SUDAH diverifikasi halaman induknya
// (login + roster), jadi tidak ada isian identitas — nama & divisinya dikirim
// sebagai props untuk ditampilkan.
export function CommitteeEvaluationForm({
  slug,
  eventTitle,
  userName,
  divisionName,
}: {
  slug: string;
  eventTitle: string;
  userName: string;
  divisionName: string | null;
}) {
  const t = useT();
  const [state, formAction, isPending] = useActionState<CommitteeEvaluationFormState, FormData>(
    submitCommitteeEvaluation,
    {},
  );

  if (state.ok || state.already) {
    const already = !state.ok;
    return (
      <div className={`${CARD} items-center py-10 text-center`}>
        <CheckCircle2 className="text-primary-container" size={40} aria-hidden="true" />
        <h2 className="text-headline-md text-on-background">{already ? t("ceval.alreadyTitle") : t("ceval.thanksTitle")}</h2>
        <p className="text-body-md text-on-surface-variant max-w-md">{already ? t("ceval.alreadyBody") : t("ceval.thanksBody")}</p>
        <Link href={`/events/${slug}`} className={`${BTN} border border-outline-variant text-on-background hover:bg-surface-container-low`}>
          <ArrowLeft size={16} aria-hidden="true" /> {t("ceval.backToEvent")}
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="slug" value={slug} />

      {state.error && (
        <p role="alert" className="rounded-lg bg-error-container/40 px-4 py-3 text-body-md text-on-error-container">
          {state.error === "login"
            ? t("ceval.errorLogin")
            : state.error === "window"
              ? t("ceval.errorWindow")
              : state.error === "ratings"
                ? t("ceval.errorRatings")
                : state.error === "required"
                  ? t("ceval.errorRequired")
                  : t("ceval.errorGeneric")}
        </p>
      )}

      <section className={CARD}>
        <h2 className="text-headline-sm text-on-background">{t("ceval.identity")}</h2>
        <p className="text-body-md text-on-background">
          <span className={LABEL}>{t("ceval.identityAs")}</span>
          <span className="block mt-1 font-semibold">{userName}</span>
          {divisionName && (
            <span className="block text-body-sm text-on-surface-variant">
              {t("ceval.identityDivision", { division: divisionName })}
            </span>
          )}
        </p>
        <p className="text-body-sm text-on-surface-variant">{t("ceval.identityNote")}</p>
      </section>

      <section className={CARD}>
        <h2 className="text-headline-sm text-on-background">{t("ceval.aspectsTitle")}</h2>
        <p className="text-body-sm text-on-surface-variant -mt-2">{t("ceval.aspectsNote")}</p>
        {COMMITTEE_EVAL_ASPECTS.map((aspect) => (
          <Scale5
            key={aspect.field}
            name={aspect.field}
            legend={t(aspect.labelKey)}
            hint={aspect.hintKey ? t(aspect.hintKey) : undefined}
            lowLabel={t("eval.scaleLow")}
            highLabel={t("eval.scaleHigh")}
          />
        ))}
      </section>

      <section className={CARD}>
        <p className="text-body-sm text-on-surface-variant -mt-2">
          <span className="text-primary-container" aria-hidden="true">*</span> {t("eval.requiredNote")}
        </p>
        {Object.values(COMMITTEE_EVAL_TEXT).map((q) => (
          <TextAreaField
            key={q.name}
            name={q.name}
            label={t(q.labelKey)}
            optional={q.optional}
            optionalLabel={t("eval.optional")}
          />
        ))}
      </section>

      <button
        type="submit"
        disabled={isPending}
        className={`${BTN} deco-btn self-start bg-accent text-on-accent hover:brightness-95 disabled:opacity-60`}
      >
        {isPending ? t("ceval.submitting") : t("ceval.submit")}
      </button>

      <p className="text-body-sm text-on-surface-variant">{t("ceval.footer", { event: eventTitle })}</p>
    </form>
  );
}