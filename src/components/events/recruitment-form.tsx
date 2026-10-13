"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { submitRecruitmentApplication } from "@/app/actions/event-recruitment";
import { type RecruitFormState, type RecruitQuestionRow, splitOptions } from "@/lib/event-recruitment-questions";

const CARD = "bg-surface-container-lowest border border-outline-variant rounded-xl p-5 sm:p-6 flex flex-col gap-5";
const INPUT =
  "w-full rounded-md border border-outline-variant bg-surface-container-low px-3 py-2.5 text-body-md text-on-background focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const TEXTAREA = `${INPUT} resize-y min-h-[96px]`;
const BTN =
  "inline-flex items-center justify-center gap-2 rounded-md px-6 py-3 text-label-caps uppercase tracking-wide transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function RecruitmentForm({
  slug,
  eventTitle,
  questions,
}: {
  slug: string;
  eventTitle: string;
  questions: RecruitQuestionRow[];
}) {
  const [state, formAction, isPending] = useActionState<RecruitFormState, FormData>(
    submitRecruitmentApplication,
    {},
  );
  const [clientMissing, setClientMissing] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    const form = e.currentTarget;
    const missing = questions.some((q) => {
      if (!q.required) return false;
      const name = `q_${q.id}`;
      const inputs = Array.from(form.elements).filter(
        (el): el is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement =>
          (el instanceof HTMLInputElement ||
            el instanceof HTMLTextAreaElement ||
            el instanceof HTMLSelectElement) &&
          el.name === name,
      );
      if (q.type === "multiselect") {
        const boxes = inputs.filter((f) => f instanceof HTMLInputElement);
        return !boxes.some((f) => f.type === "checkbox" && f.checked);
      }
      if (q.type === "radio") {
        return !inputs.some((f) => f instanceof HTMLInputElement && f.checked);
      }
      const single = inputs.find((f) => f instanceof HTMLSelectElement || f instanceof HTMLInputElement);
      if (!single) return true;
      if (single instanceof HTMLSelectElement) return single.value.trim() === "";
      if (single.type === "checkbox" || single.type === "radio") return !single.checked;
      return single.value.trim() === "";
    });
    setClientMissing(missing);
    if (missing) e.preventDefault();
  }

  if (state.ok) {
    return (
      <div className={`${CARD} items-center py-10 text-center`}>
        <CheckCircle2 className="text-primary-container" size={40} aria-hidden="true" />
        <h2 className="text-headline-md text-on-background">Lamaran Terkirim</h2>
        <p className="text-body-md text-on-surface-variant max-w-md">
          Terima kasih, {eventTitle}. Lamaranmu akan ditinjau oleh BPH. Pantau terus untuk
          informasi selanjutnya.
        </p>
        <Link href={`/events/${slug}`} className={`${BTN} border border-outline-variant text-on-background hover:bg-surface-container-low`}>
          <ArrowLeft size={16} aria-hidden="true" /> Kembali ke halaman acara
        </Link>
      </div>
    );
  }

  if (state.already) {
    return (
      <div className={`${CARD} items-center py-10 text-center`}>
        <CheckCircle2 className="text-primary-container" size={40} aria-hidden="true" />
        <h2 className="text-headline-md text-on-background">Sudah Mendaftar</h2>
        <p className="text-body-md text-on-surface-variant max-w-md">
          Kamu sudah mengirimkan lamaran untuk {eventTitle}. Tim BPH akan meninjaunya.
        </p>
        <Link href={`/events/${slug}`} className={`${BTN} border border-outline-variant text-on-background hover:bg-surface-container-low`}>
          <ArrowLeft size={16} aria-hidden="true" /> Kembali ke halaman acara
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} onSubmit={onSubmit} className="flex flex-col gap-5">
      <input type="hidden" name="slug" value={slug} />

      {clientMissing && (
        <p role="alert" className="rounded-lg bg-error-container/40 px-4 py-3 text-body-md text-on-error-container">
          Semua pertanyaan wajib harus diisi.
        </p>
      )}

      {state.error && (
        <p role="alert" className="rounded-lg bg-error-container/40 px-4 py-3 text-body-md text-on-error-container">
          {state.error === "login" ? "Silakan login terlebih dahulu." :
           state.error === "closed" ? "Pendaftaran panitia untuk acara ini sudah ditutup." :
           state.error === "already" ? "Kamu sudah mendaftar untuk acara ini." :
           state.error === "required" ? "Semua pertanyaan wajib harus diisi." :
           "Terjadi kesalahan. Silakan coba lagi."}
        </p>
      )}

      <p className="text-body-sm text-on-surface-variant">
        <span className="text-primary-container" aria-hidden="true">*</span> Wajib diisi
      </p>

      <section className={CARD}>
        <h2 className="text-headline-sm text-on-background">Identitas</h2>
        <p className="text-body-md text-on-background">
          Kamu akan mendaftar sebagai akun yang sedang login. Pastikan data dirimu sudah
          sesuai di halaman profil.
        </p>
      </section>

      {questions.length > 0 && (
        <section className={CARD}>
          <h2 className="text-headline-sm text-on-background">Pertanyaan Pendaftaran</h2>
          {questions.map((q) => {
            const name = `q_${q.id}`;
            const options = splitOptions(q.options);
            const title = (
              <span className="text-body-md font-semibold text-on-background">
                {q.label}{" "}
                {q.required ? (
                  <span className="text-primary-container" aria-hidden="true">*</span>
                ) : (
                  <span className="text-body-sm font-normal text-on-surface-variant">(opsional)</span>
                )}
              </span>
            );

            if (q.type === "text") {
              return (
                <label key={q.id} className="flex flex-col gap-1.5">
                  {title}
                  <input name={name} maxLength={300} required={q.required} aria-required={q.required} className={INPUT} />
                </label>
              );
            }
            if (q.type === "textarea") {
              return (
                <label key={q.id} className="flex flex-col gap-1.5">
                  {title}
                  <textarea name={name} maxLength={2000} rows={3} required={q.required} aria-required={q.required} className={TEXTAREA} />
                </label>
              );
            }
            if (q.type === "select") {
              return (
                <label key={q.id} className="flex flex-col gap-1.5">
                  {title}
                  <select name={name} defaultValue="" required={q.required} aria-required={q.required} className={INPUT}>
                    <option value="">Pilih...</option>
                    {options.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </label>
              );
            }
            const inputType = q.type === "radio" ? "radio" : "checkbox";
            return (
              <fieldset key={q.id} className="flex flex-col gap-2">
                <legend className="mb-1">{title}</legend>
                {options.map((o) => (
                  <label key={o} className="flex items-start gap-3">
                    <input
                      type={inputType}
                      name={name}
                      value={o}
                      required={q.type === "radio" && q.required}
                      className="mt-1 h-4 w-4 accent-primary-container"
                    />
                    <span className="text-body-md text-on-background">{o}</span>
                  </label>
                ))}
              </fieldset>
            );
          })}
        </section>
      )}

      <button
        type="submit"
        disabled={isPending}
        className={`${BTN} deco-btn self-start bg-accent text-on-accent hover:brightness-95 disabled:opacity-60`}
      >
        {isPending ? "Mengirim..." : "Kirim Lamaran"}
      </button>

      <p className="text-body-sm text-on-surface-variant">
        Dengan mengirim lamaran, data jawabanmu akan ditinjau oleh BPH {eventTitle}.
      </p>
    </form>
  );
}