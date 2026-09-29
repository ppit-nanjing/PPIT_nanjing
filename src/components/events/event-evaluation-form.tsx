"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { submitEventEvaluation, type EventEvaluationFormState } from "@/app/actions/event-evaluations";
import { useT } from "@/lib/i18n/client";
import type { EvaluationSection } from "@/lib/event-evaluation-template";

const CARD = "bg-surface-container-lowest border border-outline-variant rounded-xl p-5 sm:p-6 flex flex-col gap-5";
const LABEL = "text-label-caps uppercase tracking-wide text-on-surface-variant";
const INPUT =
  "w-full rounded-md border border-outline-variant bg-surface-container-low px-3 py-2.5 text-body-md text-on-background focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const TEXTAREA = `${INPUT} resize-y min-h-[96px]`;
const BTN =
  "inline-flex items-center justify-center gap-2 rounded-md px-6 py-3 text-label-caps uppercase tracking-wide transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function RatingScale({
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
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <label key={n} className="cursor-pointer">
            <input type="radio" name={name} value={n} required className="peer sr-only" />
            <span className="flex h-10 w-10 items-center justify-center rounded-md border border-outline-variant bg-surface-container-low text-body-md text-on-surface-variant transition-colors peer-checked:border-primary-container peer-checked:bg-primary-container peer-checked:text-on-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary-container peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background">
              {n}
            </span>
          </label>
        ))}
      </div>
      <div className="flex max-w-[26rem] justify-between text-label-caps text-on-surface-variant">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </fieldset>
  );
}

export function EventEvaluationForm({
  slug,
  eventTitle,
  cityOptions,
  sections,
}: {
  slug: string;
  eventTitle: string;
  cityOptions: string[];
  sections: EvaluationSection[];
}) {
  const t = useT();
  const [state, formAction, isPending] = useActionState<EventEvaluationFormState, FormData>(submitEventEvaluation, {});
  const [anonymous, setAnonymous] = useState(false);
  const [token, setToken] = useState("");
  const [doneBefore, setDoneBefore] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      let deviceToken = "";
      try {
        deviceToken = localStorage.getItem("ppit_eval_token") ?? "";
        if (!deviceToken) {
          deviceToken =
            typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
              ? crypto.randomUUID()
              : "tok-" + Date.now() + "-" + Math.random().toString(36).slice(2);
          localStorage.setItem("ppit_eval_token", deviceToken);
        }
        setDoneBefore(localStorage.getItem("ppit_eval_done_" + slug) === "1");
      } catch {
        deviceToken = "tok-" + Date.now() + "-" + Math.random().toString(36).slice(2);
      }
      setToken(deviceToken);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [slug]);

  useEffect(() => {
    if (state.ok) {
      try {
        localStorage.setItem("ppit_eval_done_" + slug, "1");
      } catch {}
    }
  }, [state.ok, slug]);

  if (state.ok || state.already || doneBefore) {
    const already = !state.ok;
    return (
      <div className={`${CARD} items-center py-10 text-center`}>
        <CheckCircle2 className="text-primary-container" size={40} aria-hidden="true" />
        <h2 className="text-headline-md text-on-background">{already ? t("eval.alreadyTitle") : t("eval.thanksTitle")}</h2>
        <p className="text-body-md text-on-surface-variant max-w-md">{already ? t("eval.alreadyBody") : t("eval.thanksBody")}</p>
        <Link href={`/events/${slug}`} className={`${BTN} border border-outline-variant text-on-background hover:bg-surface-container-low`}>
          <ArrowLeft size={16} aria-hidden="true" /> {t("eval.backToEvent")}
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="token" value={token} />

      {state.error && (
        <p className="rounded-lg bg-error-container/40 px-4 py-3 text-body-md text-on-error-container">
          {state.error === "ratings"
            ? t("eval.requiredRatings")
            : state.error === "required"
              ? t("eval.requiredTexts")
              : t("eval.errorGeneric")}
        </p>
      )}

      <p className="text-body-sm text-on-surface-variant">
        <span className="text-primary-container" aria-hidden="true">*</span> {t("eval.requiredNote")}
      </p>

      <section className={CARD}>
        <h2 className="text-headline-sm text-on-background">{t("eval.identity")}</h2>
        {!anonymous && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className={LABEL}>{t("eval.name")}</span>
              <input name="name" maxLength={80} autoComplete="name" className={INPUT} />
              <span className="text-body-sm text-on-surface-variant">{t("eval.nameHint")}</span>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={LABEL}>{t("eval.city")}</span>
              <select name="city" defaultValue="" className={INPUT}>
                <option value="">{t("eval.cityPlaceholder")}</option>
                {cityOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value="Lainnya">{t("eval.cityOther")}</option>
              </select>
            </label>
          </div>
        )}
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="anonymous"
            checked={anonymous}
            onChange={(e) => setAnonymous(e.target.checked)}
            className="mt-1 h-4 w-4 accent-primary-container"
          />
          <span>
            <span className="text-body-md text-on-background">{t("eval.anonymous")}</span>
            <span className="block text-body-sm text-on-surface-variant">{t("eval.anonymousHint")}</span>
          </span>
        </label>
      </section>

      {sections.map((section) => (
        <section key={section.titleKey} className={CARD}>
          <h2 className="text-headline-sm text-on-background">{t(section.titleKey)}</h2>
          {section.questions.map((q) =>
            q.kind === "rating" ? (
              <RatingScale
                key={q.name}
                name={q.name}
                legend={t(q.labelKey)}
                hint={q.hintKey ? t(q.hintKey) : undefined}
                lowLabel={t("eval.scaleLow")}
                highLabel={t("eval.scaleHigh")}
              />
            ) : (
              <label key={q.name} className="flex flex-col gap-1.5">
                <span className="text-body-md font-semibold text-on-background">
                  {t(q.labelKey)}{" "}
                  {q.optional ? (
                    <span className="text-body-sm font-normal text-on-surface-variant">({t("eval.optional")})</span>
                  ) : (
                    <span className="text-primary-container" aria-hidden="true">*</span>
                  )}
                </span>
                <textarea name={q.name} maxLength={2000} rows={3} required={!q.optional} aria-required={!q.optional} className={TEXTAREA} />
              </label>
            ),
          )}
        </section>
      ))}

      <button type="submit" disabled={isPending || !token} className={`${BTN} self-start bg-primary-container text-on-primary hover:bg-primary disabled:opacity-60`}>
        {isPending ? t("eval.submitting") : t("eval.submit")}
      </button>

      <p className="text-body-sm text-on-surface-variant">
        {t("eval.footer", { event: eventTitle })}
      </p>
    </form>
  );
}
