"use client";

import { useState, type ReactNode } from "react";
import { BarChart3, Download, ListChecks, Trash2, Users } from "lucide-react";
import type { InferSelectModel } from "drizzle-orm";
import type { eventEvaluations } from "@/db/schema";
import { ConfirmButton } from "@/components/console/confirm-button";
import { deleteEventEvaluation } from "@/app/actions/event-evaluations";
import { ratingQuestions, textQuestions, type EvaluationSection } from "@/lib/event-evaluation-template";
import { type EvalQuestionRow, SCALE_MAX, isScaleType } from "@/lib/event-evaluation-questions";
import {
  type EvalAnswerRow,
  type EvalColumn,
  answersByEvaluation,
  choiceCounts,
  evalColumns,
  formatAnswer,
  isChoiceType,
  ratingValues,
} from "@/lib/event-evaluation-results";

type Evaluation = InferSelectModel<typeof eventEvaluations>;

// Respons dari template tetap: keempat penilaian bawaan terisi. Respons dari
// pertanyaan buatan panitia membiarkannya NULL (jawabannya ada di tabel jawaban).
type LegacyEvaluation = Evaluation & {
  ratingRegistration: number;
  ratingFacilities: number;
  ratingCgt: number;
  ratingOverall: number;
};

function isLegacy(e: Evaluation): e is LegacyEvaluation {
  return (
    e.ratingRegistration != null &&
    e.ratingFacilities != null &&
    e.ratingCgt != null &&
    e.ratingOverall != null
  );
}

function formatWhen(date: Date | string): string {
  return new Date(date).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

function respondentLabel(e: Evaluation): string {
  return e.anonymous || !e.respondentName ? "Anonim" : e.respondentName;
}

function ExportLinks({ eventId }: { eventId: string }) {
  const base = `/api/console/events/${eventId}/evaluasi/export`;
  const cls =
    "inline-flex items-center gap-1.5 rounded-md border border-outline-variant px-3 py-2 text-label-caps uppercase tracking-wide text-on-background hover:bg-surface-container-low transition-colors";
  return (
    <div className="flex flex-wrap gap-2">
      <a href={`${base}?format=csv`} className={cls}>
        <Download size={14} aria-hidden="true" /> CSV
      </a>
      <a href={`${base}?format=xlsx`} className={cls}>
        <Download size={14} aria-hidden="true" /> Excel
      </a>
    </div>
  );
}

function Distribution({ values, tall, scale = 10 }: { values: number[]; tall?: boolean; scale?: number }) {
  const counts = Array.from({ length: scale }, (_, i) => values.filter((v) => v === i + 1).length);
  const max = Math.max(...counts, 1);
  const h = tall ? 56 : 32;
  return (
    <div className="flex items-end gap-1" aria-hidden="true">
      {counts.map((c, i) => (
        <span key={i} title={`${i + 1}: ${c} respons`} className="w-full rounded-sm bg-primary-container/70" style={{ height: `${Math.max(2, Math.round((c / max) * h))}px` }} />
      ))}
    </div>
  );
}

function Tabs({ tabs, active, onChange }: { tabs: { id: string; label: string; icon: ReactNode }[]; active: string; onChange: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg border border-outline-variant bg-surface-container-low p-1 w-fit" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={`inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-label-caps uppercase tracking-wide transition-colors ${
            active === tab.id ? "bg-primary-container text-on-primary" : "text-on-surface-variant hover:text-on-background"
          }`}
        >
          {tab.icon} {tab.label}
        </button>
      ))}
    </div>
  );
}

const TAB_LIST = [
  { id: "grafik", label: "Grafik", icon: <BarChart3 size={14} aria-hidden="true" /> },
  { id: "jawaban", label: "Jawaban", icon: <ListChecks size={14} aria-hidden="true" /> },
  { id: "respons", label: "Respons", icon: <Users size={14} aria-hidden="true" /> },
];

export function EvaluationResults({
  eventId,
  evaluations,
  sections,
  questions = [],
  answers = [],
}: {
  eventId: string;
  evaluations: Evaluation[];
  sections: EvaluationSection[];
  /** Pertanyaan buatan panitia (kosong = acara memakai template tetap). */
  questions?: EvalQuestionRow[];
  answers?: EvalAnswerRow[];
}) {
  const legacy = evaluations.filter(isLegacy);
  const custom = evaluations.filter((e) => !isLegacy(e));
  // Mode pertanyaan sendiri berlaku selama acara punya pertanyaan, atau sudah ada
  // respons bentuk itu (mis. semua pertanyaan dihapus setelah ada jawaban).
  if (questions.length > 0 || custom.length > 0) {
    return (
      <CustomResults
        eventId={eventId}
        evaluations={custom}
        questions={questions}
        answers={answers}
        legacyCount={legacy.length}
      />
    );
  }
  return <TemplateResults eventId={eventId} evaluations={legacy} sections={sections} />;
}

// ---------- Template tetap (WIF / umum) ----------

function TemplateResults({
  eventId,
  evaluations,
  sections,
}: {
  eventId: string;
  evaluations: LegacyEvaluation[];
  sections: EvaluationSection[];
}) {
  const [tab, setTab] = useState<"grafik" | "jawaban" | "respons">("grafik");

  if (evaluations.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-body-md text-on-surface-variant max-w-2xl">
          Belum ada respons. Bagikan tautan <code className="text-on-background">/events/&lt;slug&gt;/evaluasi</code> ke
          grup peserta — buat short link + QR-nya di menu Tautan supaya gampang disebar di WeChat.
        </p>
        <ExportLinks eventId={eventId} />
      </div>
    );
  }

  const ratingQs = ratingQuestions(sections);
  const textQs = textQuestions(sections);
  const anonymousCount = evaluations.filter((e) => e.anonymous).length;
  const allRatings = ratingQs.flatMap((q) => evaluations.map((e) => e[q.name]));
  const overallAvg = allRatings.reduce((s, v) => s + v, 0) / allRatings.length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-surface-container-low px-3 py-1.5 text-label-caps text-on-surface-variant">
            <b className="text-on-background">{evaluations.length}</b> respons
          </span>
          <span className="rounded-md bg-surface-container-low px-3 py-1.5 text-label-caps text-on-surface-variant">
            rata-rata <b className="text-on-background">{overallAvg.toFixed(1)}</b>/10
          </span>
          <span className="rounded-md bg-surface-container-low px-3 py-1.5 text-label-caps text-on-surface-variant">
            <b className="text-on-background">{anonymousCount}</b> anonim
          </span>
        </div>
        <ExportLinks eventId={eventId} />
      </div>

      <Tabs active={tab} onChange={(id) => setTab(id as typeof tab)} tabs={TAB_LIST} />

      {tab === "grafik" && (
        <div className="grid grid-cols-1 gap-3 pb-1 sm:grid-cols-2">
          {ratingQs.map((q) => {
            const values = evaluations.map((e) => e[q.name]);
            const avg = values.reduce((s, v) => s + v, 0) / values.length;
            return (
              <div key={q.name} className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-label-caps uppercase tracking-wide text-on-surface-variant">{q.label}</p>
                  <p className="text-headline-lg text-on-background leading-none">{avg.toFixed(1)}</p>
                </div>
                <div className="mt-4">
                  <Distribution values={values} tall />
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-on-surface-variant">
                  <span>1</span>
                  <span>10</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "jawaban" && (
        <div className="flex flex-col gap-4 pb-1">
          {[...ratingQs, ...textQs].map((q) =>
            q.kind === "rating" ? (
              <div key={q.name} className="rounded-lg border border-outline-variant p-4">
                <p className="text-label-caps uppercase tracking-wide text-on-surface-variant">{q.label} — penilaian 1–10</p>
                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <p className="text-body-md text-on-background">
                    rata-rata{" "}
                    <b>{(
                      evaluations.map((e) => e[q.name]).reduce((s, v) => s + v, 0) / evaluations.length
                    ).toFixed(1)}</b>{" "}
                    dari {evaluations.length} respons
                  </p>
                  <div className="min-w-[220px] max-w-xs flex-1">
                    <Distribution values={evaluations.map((e) => e[q.name])} />
                  </div>
                </div>
                <p className="mt-3 text-body-sm text-on-surface-variant">
                  {Array.from({ length: 10 }, (_, i) => {
                    const n = valuesCount(evaluations, q.name, i + 1);
                    return n > 0 ? `${i + 1}×${n}` : null;
                  })
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            ) : (
              <div key={q.name} className="rounded-lg border border-outline-variant p-4">
                <p className="text-label-caps uppercase tracking-wide text-on-surface-variant">{q.label}</p>
                {(() => {
                  const textAnswers = evaluations.filter((e) => e[q.name]);
                  if (textAnswers.length === 0) {
                    return <p className="mt-3 text-body-sm text-on-surface-variant">— belum ada jawaban —</p>;
                  }
                  return (
                    <ul className="mt-3 flex flex-col gap-2">
                      {textAnswers.map((e) => (
                        <li key={e.id} className="rounded-md bg-surface-container-low px-3 py-2">
                          <p className="text-body-md text-on-background whitespace-pre-wrap">{e[q.name]}</p>
                          <p className="mt-1 text-label-caps text-on-surface-variant">
                            {respondentLabel(e)} · {formatWhen(e.createdAt)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  );
                })()}
              </div>
            ),
          )}
        </div>
      )}

      {tab === "respons" && (
        <ul className="flex flex-col gap-3 pb-1">
          {evaluations.map((e) => {
            const texts = textQs.filter((q) => e[q.name]);
            return (
              <li key={e.id} className="rounded-lg border border-outline-variant p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-body-md font-semibold text-on-background">
                      {respondentLabel(e)}
                      {e.respondentCity && !e.anonymous ? (
                        <span className="ml-2 text-body-sm font-normal text-on-surface-variant">{e.respondentCity}</span>
                      ) : null}
                    </p>
                    <p className="text-label-caps text-on-surface-variant">{formatWhen(e.createdAt)}</p>
                  </div>
                  <DeleteResponse eventId={eventId} id={e.id} />
                </div>

                <div className="flex flex-wrap gap-2">
                  {ratingQs.map((q) => (
                    <span key={q.name} className="rounded-md bg-surface-container-low px-2.5 py-1 text-label-caps text-on-surface-variant">
                      {q.label}: <b className="text-on-background">{e[q.name]}</b>
                    </span>
                  ))}
                </div>

                {texts.length > 0 && (
                  <div className="flex flex-col gap-2 border-t border-outline-variant/60 pt-3">
                    {texts.map((q) => (
                      <div key={q.name}>
                        <p className="text-label-caps uppercase tracking-wide text-on-surface-variant">{q.label}</p>
                        <p className="text-body-md text-on-background whitespace-pre-wrap">{e[q.name]}</p>
                      </div>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function DeleteResponse({ eventId, id }: { eventId: string; id: string }) {
  return (
    <ConfirmButton
      action={deleteEventEvaluation}
      payload={{ id, eventId }}
      message="Hapus respons evaluasi ini? Tindakan ini tidak bisa dibatalkan."
      aria-label="Hapus respons"
      className="rounded-md border border-outline-variant p-2 text-error hover:bg-error-container/30 transition-colors"
    >
      <Trash2 size={16} aria-hidden="true" />
    </ConfirmButton>
  );
}

// ---------- Pertanyaan buatan panitia ----------

function ChoiceBars({ counts }: { counts: { option: string; count: number }[] }) {
  const max = Math.max(...counts.map((c) => c.count), 1);
  return (
    <ul className="mt-3 flex flex-col gap-2">
      {counts.map((c) => (
        <li key={c.option}>
          <div className="flex items-baseline justify-between gap-3 text-body-sm text-on-background">
            <span className="min-w-0 break-words">{c.option}</span>
            <b>{c.count}</b>
          </div>
          <div className="mt-1 h-2 rounded-sm bg-surface-container-low">
            <div className="h-2 rounded-sm bg-primary-container/70" style={{ width: `${(c.count / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function average(values: number[]): string {
  return values.length === 0 ? "–" : (values.reduce((s, v) => s + v, 0) / values.length).toFixed(1);
}

function ColumnTitle({ column, suffix }: { column: EvalColumn; suffix?: string }) {
  return (
    <p className="text-label-caps uppercase tracking-wide text-on-surface-variant">
      {column.label}
      {suffix ? ` — ${suffix}` : ""}
      {column.removed ? " (pertanyaan sudah dihapus)" : ""}
    </p>
  );
}

function CustomResults({
  eventId,
  evaluations,
  questions,
  answers,
  legacyCount,
}: {
  eventId: string;
  evaluations: Evaluation[];
  questions: EvalQuestionRow[];
  answers: EvalAnswerRow[];
  legacyCount: number;
}) {
  const [tab, setTab] = useState<"grafik" | "jawaban" | "respons">("grafik");
  const columns = evalColumns(questions, answers);
  const byEvaluation = answersByEvaluation(answers);

  const legacyNote =
    legacyCount > 0 ? (
      <p className="text-body-sm text-on-surface-variant max-w-2xl">
        {legacyCount} respons dengan pertanyaan standar tidak ditampilkan di sini, tapi tetap tersimpan dan ikut di
        ekspor CSV/Excel.
      </p>
    ) : null;

  if (evaluations.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-body-md text-on-surface-variant max-w-2xl">
          Belum ada respons untuk pertanyaan ini. Bagikan tautan{" "}
          <code className="text-on-background">/events/&lt;slug&gt;/evaluasi</code> ke grup peserta — buat short link +
          QR-nya di menu Tautan supaya gampang disebar di WeChat.
        </p>
        {legacyNote}
        <ExportLinks eventId={eventId} />
      </div>
    );
  }

  // Penilaian 1-10 dan bintang 1-5 beda skala: rata-ratanya dihitung terpisah.
  const ratingCols = columns.filter((c) => isScaleType(c.type));
  const choiceCols = columns.filter((c) => isChoiceType(c.type));
  const anonymousCount = evaluations.filter((e) => e.anonymous).length;
  const averageChips = (["rating", "stars"] as const)
    .map((type) => ({
      type,
      values: columns.filter((c) => c.type === type).flatMap((c) => ratingValues(c, byEvaluation)),
    }))
    .filter((chip) => chip.values.length > 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-surface-container-low px-3 py-1.5 text-label-caps text-on-surface-variant">
            <b className="text-on-background">{evaluations.length}</b> respons
          </span>
          {averageChips.map((chip) => (
            <span key={chip.type} className="rounded-md bg-surface-container-low px-3 py-1.5 text-label-caps text-on-surface-variant">
              rata-rata {chip.type === "stars" ? "bintang" : "penilaian"}{" "}
              <b className="text-on-background">{average(chip.values)}</b>/{SCALE_MAX[chip.type]}
            </span>
          ))}
          <span className="rounded-md bg-surface-container-low px-3 py-1.5 text-label-caps text-on-surface-variant">
            <b className="text-on-background">{anonymousCount}</b> anonim
          </span>
        </div>
        <ExportLinks eventId={eventId} />
      </div>
      {legacyNote}

      <Tabs active={tab} onChange={(id) => setTab(id as typeof tab)} tabs={TAB_LIST} />

      {tab === "grafik" &&
        (ratingCols.length + choiceCols.length === 0 ? (
          <p className="text-body-md text-on-surface-variant">
            Belum ada pertanyaan penilaian atau pilihan untuk digrafikkan. Jawaban teks ada di tab Jawaban.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 pb-1 sm:grid-cols-2">
            {ratingCols.map((c) => {
              const values = ratingValues(c, byEvaluation);
              const scale = isScaleType(c.type) ? SCALE_MAX[c.type] : 10;
              return (
                <div key={c.key} className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <ColumnTitle column={c} />
                    <p className="text-headline-lg text-on-background leading-none">
                      {average(values)}
                      <span className="ml-1 text-body-sm text-on-surface-variant">/{scale}</span>
                    </p>
                  </div>
                  <div className="mt-4">
                    <Distribution values={values} tall scale={scale} />
                  </div>
                  <div className="mt-1 flex justify-between text-[10px] text-on-surface-variant">
                    <span>1</span>
                    <span>{scale}</span>
                  </div>
                </div>
              );
            })}
            {choiceCols.map((c) => (
              <div key={c.key} className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
                <ColumnTitle column={c} />
                <ChoiceBars counts={choiceCounts(c, byEvaluation)} />
              </div>
            ))}
          </div>
        ))}

      {tab === "jawaban" && (
        <div className="flex flex-col gap-4 pb-1">
          {columns.map((c) => {
            if (isScaleType(c.type)) {
              const values = ratingValues(c, byEvaluation);
              const scale = SCALE_MAX[c.type];
              return (
                <div key={c.key} className="rounded-lg border border-outline-variant p-4">
                  <ColumnTitle column={c} suffix={c.type === "stars" ? "bintang 1–5" : "penilaian 1–10"} />
                  <div className="mt-3 flex flex-wrap items-center gap-4">
                    <p className="text-body-md text-on-background">
                      rata-rata <b>{average(values)}</b>/{scale} dari {values.length} jawaban
                    </p>
                    <div className="min-w-[220px] max-w-xs flex-1">
                      <Distribution values={values} scale={scale} />
                    </div>
                  </div>
                </div>
              );
            }
            if (isChoiceType(c.type)) {
              return (
                <div key={c.key} className="rounded-lg border border-outline-variant p-4">
                  <ColumnTitle column={c} />
                  <ChoiceBars counts={choiceCounts(c, byEvaluation)} />
                </div>
              );
            }
            const withAnswer = evaluations.filter((e) => byEvaluation.get(e.id)?.get(c.key)?.valueText);
            return (
              <div key={c.key} className="rounded-lg border border-outline-variant p-4">
                <ColumnTitle column={c} />
                {withAnswer.length === 0 ? (
                  <p className="mt-3 text-body-sm text-on-surface-variant">— belum ada jawaban —</p>
                ) : (
                  <ul className="mt-3 flex flex-col gap-2">
                    {withAnswer.map((e) => (
                      <li key={e.id} className="rounded-md bg-surface-container-low px-3 py-2">
                        <p className="text-body-md text-on-background whitespace-pre-wrap">
                          {byEvaluation.get(e.id)?.get(c.key)?.valueText}
                        </p>
                        <p className="mt-1 text-label-caps text-on-surface-variant">
                          {respondentLabel(e)} · {formatWhen(e.createdAt)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === "respons" && (
        <ul className="flex flex-col gap-3 pb-1">
          {evaluations.map((e) => {
            const own = byEvaluation.get(e.id);
            return (
              <li key={e.id} className="rounded-lg border border-outline-variant p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-body-md font-semibold text-on-background">
                      {respondentLabel(e)}
                      {e.respondentCity && !e.anonymous ? (
                        <span className="ml-2 text-body-sm font-normal text-on-surface-variant">{e.respondentCity}</span>
                      ) : null}
                    </p>
                    <p className="text-label-caps text-on-surface-variant">{formatWhen(e.createdAt)}</p>
                  </div>
                  <DeleteResponse eventId={eventId} id={e.id} />
                </div>
                <div className="flex flex-col gap-2 border-t border-outline-variant/60 pt-3">
                  {columns.map((c) => {
                    const value = formatAnswer(own?.get(c.key));
                    if (!value) return null;
                    return (
                      <div key={c.key}>
                        <ColumnTitle column={c} />
                        <p className="text-body-md text-on-background whitespace-pre-wrap">{value}</p>
                      </div>
                    );
                  })}
                  {!own && <p className="text-body-sm text-on-surface-variant">— semua pertanyaan dikosongkan —</p>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function valuesCount(evaluations: LegacyEvaluation[], name: keyof LegacyEvaluation, value: number): number {
  return evaluations.filter((e) => e[name] === value).length;
}
