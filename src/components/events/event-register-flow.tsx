"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, CalendarDays, MapPin } from "lucide-react";
import { useT } from "@/lib/i18n/client";

export type FlowStep = { id: string; title: string; hint?: string; content: ReactNode };

/**
 * Formulir pendaftaran acara satu-layar-per-bagian, halaman tersendiri
 * (/events/[slug]/register) — bukan lagi kotak sempit di sidebar halaman acara.
 * Gaya "isi satu bagian, lalu Lanjut" à la Google Form, tapi lega: poster acara
 * di atas, judul bagian besar, progres jelas, transisi halus.
 *
 * Tetap SATU <form> yang di-submit sekali ke server action `registerForEvent`
 * (server tidak berubah, tetap menerima satu FormData berisi semua field).
 * Komponen ini hanya mengatur bagian mana yang tampak + validasi per-langkah.
 *
 * SEMUA bagian tetap ter-mount (bagian non-aktif cuma `hidden`) supaya nilai
 * yang sudah diisi — termasuk state upload berkas — tidak hilang saat pindah
 * langkah. Field `required` di bagian non-aktif dilepas sementara (disimpan di
 * data-attr): browser menolak submit form yang punya kontrol wajib ter-`hidden`
 * ("An invalid form control is not focusable"). Dipasang lagi saat bagiannya
 * aktif. Trik ini load-bearing — sudah diverifikasi di browser sebelumnya.
 */
export function EventRegisterFlow({
  action,
  steps,
  submitLabel,
  event,
  backHref,
}: {
  action: (formData: FormData) => void | Promise<void>;
  steps: FlowStep[];
  submitLabel: string;
  event: { title: string; posterUrl: string | null; dateLabel: string | null; location: string | null };
  backHref: string;
}) {
  const t = useT();
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const formRef = useRef<HTMLFormElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const last = steps.length - 1;
  const single = steps.length <= 1;

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    form.querySelectorAll<HTMLElement>("[data-flow-step]").forEach((container, i) => {
      container
        .querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea")
        .forEach((el) => {
          if (i === step) {
            if (el.dataset.flowReq === "1") {
              el.required = true;
              delete el.dataset.flowReq;
            }
          } else if (el.required) {
            el.required = false;
            el.dataset.flowReq = "1";
          }
        });
    });
  }, [step]);

  // Sebelum submit sungguhan: pastikan TIDAK ada kontrol wajib yang masih
  // `required` di bagian tersembunyi (bisa terjadi kalau React me-render ulang
  // sebuah field — mis. FileUpload setelah upload gagal — dan memasang balik
  // `required` di langkah yang sudah ditinggalkan). Browser menolak submit form
  // dengan kontrol wajib non-focusable, dan errornya senyap.
  function stripHiddenRequired() {
    const form = formRef.current;
    if (!form) return;
    form.querySelectorAll<HTMLElement>("[data-flow-step]").forEach((container, i) => {
      if (i === step) return;
      container
        .querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea")
        .forEach((el) => {
          if (el.required) {
            el.required = false;
            el.dataset.flowReq = "1";
          }
        });
    });
  }

  function currentStepValid() {
    const container = formRef.current?.querySelector<HTMLElement>(`[data-flow-step="${step}"]`);
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

  function go(next: number, direction: 1 | -1) {
    setDir(direction);
    setStep(next);
    topRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }

  const pct = Math.round(((step + 1) / steps.length) * 100);

  return (
    <div ref={topRef} className="mx-auto w-full max-w-2xl scroll-mt-6">
      {/* Identitas acara — biar peserta tahu persis mereka mendaftar ke apa. */}
      <div className="evt-surface overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest">
        {event.posterUrl && (
          <div className="relative h-40 w-full sm:h-52">
            <Image src={event.posterUrl} alt={event.title} fill sizes="(max-width: 640px) 100vw, 672px" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
          </div>
        )}
        <div className="flex flex-col gap-1 p-5">
          <span className="text-label-caps uppercase tracking-wide text-primary-container">{t("events.registerTitle")}</span>
          <h1 className="text-headline-md text-on-background">{event.title}</h1>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-body-sm text-on-surface-variant">
            {event.dateLabel && (
              <span className="flex items-center gap-1.5">
                <CalendarDays size={14} aria-hidden="true" /> {event.dateLabel}
              </span>
            )}
            {event.location && (
              <span className="flex items-center gap-1.5">
                <MapPin size={14} aria-hidden="true" /> {event.location}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Progres */}
      {!single && (
        <div className="sticky top-2 z-10 mt-4 flex flex-col gap-1.5 rounded-xl border border-outline-variant bg-background/85 px-4 py-3 backdrop-blur">
          <div className="flex items-center justify-between text-label-caps uppercase tracking-wide text-on-surface-variant">
            <span>{steps[step]?.title}</span>
            <span>{t("events.registerStepOf", { n: step + 1, total: steps.length })}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-low">
            <motion.div
              className="h-full rounded-full bg-primary-container"
              initial={false}
              animate={{ width: `${pct}%` }}
              transition={{ duration: reduceMotion ? 0 : 0.35, ease: "easeOut" }}
            />
          </div>
        </div>
      )}

      <form ref={formRef} action={action} className="mt-4 flex flex-col gap-5">
        <div className="relative">
          {steps.map((s, i) => {
            const active = i === step;
            return (
              <div key={s.id} data-flow-step={i} className={active ? "" : "hidden"}>
                <motion.div
                  initial={false}
                  animate={
                    reduceMotion
                      ? { opacity: active ? 1 : 0 }
                      : { opacity: active ? 1 : 0, x: active ? 0 : dir * 20 }
                  }
                  transition={{ duration: reduceMotion ? 0 : 0.25, ease: "easeOut" }}
                  className="evt-surface flex flex-col gap-4 rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 sm:p-6"
                >
                  {!single && (
                    <div className="flex flex-col gap-1">
                      <h2 className="text-headline-sm text-on-background">{s.title}</h2>
                      {s.hint && <p className="text-body-sm text-on-surface-variant">{s.hint}</p>}
                    </div>
                  )}
                  <div className="flex flex-col gap-4">{s.content}</div>
                </motion.div>
              </div>
            );
          })}
        </div>

        {/* Navigasi */}
        <div className="sticky bottom-0 flex gap-3 rounded-xl border border-outline-variant bg-background/90 p-3 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => go(Math.max(0, step - 1), -1)}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-outline-variant px-5 py-3.5 text-label-caps uppercase tracking-wide text-on-background transition-colors hover:bg-surface-container-low focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
            >
              <ArrowLeft size={16} aria-hidden="true" /> {t("events.wizardBack")}
            </button>
          ) : (
            <Link
              href={backHref}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-outline-variant px-5 py-3.5 text-label-caps uppercase tracking-wide text-on-surface-variant transition-colors hover:bg-surface-container-low focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
            >
              <ArrowLeft size={16} aria-hidden="true" /> {t("events.wizardBack")}
            </Link>
          )}

          {step < last ? (
            <button
              type="button"
              onClick={() => {
                if (currentStepValid()) go(Math.min(last, step + 1), 1);
              }}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-primary-container px-6 py-3.5 text-label-caps uppercase tracking-wide text-on-primary transition-colors hover:bg-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {t("events.wizardNext")} <ArrowRight size={16} aria-hidden="true" />
            </button>
          ) : (
            <button
              type="submit"
              // Jalan SEBELUM validasi bawaan browser: lucuti `required` yang
              // mungkin ter-pasang balik di langkah tersembunyi, supaya submit
              // tidak diam-diam ditolak ("invalid form control is not focusable").
              onClick={stripHiddenRequired}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-primary-container px-6 py-3.5 text-label-caps uppercase tracking-wide text-on-primary transition-colors hover:bg-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Check size={16} aria-hidden="true" /> {submitLabel}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
