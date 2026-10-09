import { Eye } from "lucide-react";
import { CheckboxField, Select } from "@/components/console/form";
import { ConfirmButton } from "@/components/console/confirm-button";
import { SubmitButton } from "@/components/console/submit-button";
import { EventEvaluationForm } from "@/components/events/event-evaluation-form";
import {
  deleteEventEvaluationQuestion,
  saveEventEvaluationQuestion,
  startEvaluationFromTemplate,
} from "@/app/actions/event-evaluation-questions";
import {
  EVAL_QUESTION_TYPE_LABELS,
  EVAL_QUESTION_TYPES,
  type EvalAudience,
  type EvalQuestionRow,
} from "@/lib/event-evaluation-questions";
import { committeeEvalTemplateQuestions } from "@/lib/committee-evaluation";
import type { EvaluationSection } from "@/lib/event-evaluation-template";

// Builder pertanyaan evaluasi per-acara + pratinjau form. Pola dan gaya sama
// dengan builder "Pertanyaan Pendaftaran" di halaman konsol acara. Server
// component: form-nya memakai server action langsung.

const FIELD = "bg-soft-gray rounded-md p-2.5 text-body-md";
const LABEL = "text-label-caps uppercase tracking-wide text-on-surface-variant";

function TypeOptions() {
  return (
    <>
      {EVAL_QUESTION_TYPES.map((value) => (
        <option key={value} value={value}>
          {EVAL_QUESTION_TYPE_LABELS[value]}
        </option>
      ))}
    </>
  );
}

export function EvaluationQuestionsBuilder({
  eventId,
  slug,
  eventTitle,
  audience = "peserta",
  questions,
  answerCounts,
  legacyResponseCount,
  cityOptions,
  sections,
}: {
  eventId: string;
  slug: string;
  eventTitle: string;
  /** Audiens pertanyaan yang disusun di builder ini. */
  audience?: EvalAudience;
  /** Pertanyaan audiens ini; kosong = form memakai template tetap audiensnya. */
  questions: EvalQuestionRow[];
  /** Jumlah jawaban yang sudah terkumpul per id pertanyaan (tipe dikunci kalau > 0). */
  answerCounts: Record<string, number>;
  /** Respons format template tetap yang sudah masuk (hanya relevan untuk peserta). */
  legacyResponseCount: number;
  cityOptions: string[];
  sections: EvaluationSection[];
}) {
  const isCommittee = audience === "panitia";
  const formPath = isCommittee ? `/events/${slug}/evaluasi-panitia` : `/events/${slug}/evaluasi`;
  // Pratinjau meniru form publiknya: peserta tanpa pertanyaan sendiri melihat
  // template tetap (sections), panitia tanpa pertanyaan sendiri melihat template
  // kolektif di committee-evaluation.ts.
  const previewQuestions = isCommittee
    ? questions.length > 0
      ? questions
      : committeeEvalTemplateQuestions()
    : questions.length > 0
      ? questions
      : undefined;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-body-md text-on-surface-variant max-w-2xl">
        {isCommittee ? (
          <>
            Kosong = form evaluasi panitia memakai <strong className="text-on-background">template kolektif</strong> (lima
            penilaian Bintang 1–5 + pertanyaan teks). Begitu ada satu pertanyaan di bawah, form evaluasi panitia memakai
            pertanyaan kamu saja. Panitia mengisinya lewat <code className="text-on-background">{formPath}</code> saat
            jendela waktu dibuka.
          </>
        ) : (
          <>
            Kosong = form evaluasi memakai <strong className="text-on-background">template standar</strong>{" "}
            ({slug.startsWith("wif") ? "versi WIF 2026 X CGT" : "versi umum"}). Begitu ada satu pertanyaan di bawah,
            form evaluasi publik memakai pertanyaan kamu saja. Peserta mengisinya lewat{" "}
            <code className="text-on-background">{formPath}</code> (aktif setelah acara dipublikasikan).
          </>
        )}
      </p>

      {questions.length === 0 && (
        <div className="flex flex-col gap-3 rounded-lg border border-outline-variant bg-surface-container-low p-4">
          <p className="text-body-md text-on-surface-variant">
            {isCommittee
              ? "Mau menyesuaikan pertanyaannya? Salin dulu template kolektif sebagai titik awal, lalu edit, hapus, atau tambah sesukamu."
              : "Mau mengubah sebagian pertanyaan? Salin dulu template standar sebagai titik awal, lalu edit, hapus, atau tambah sesukamu."}
          </p>
          {!isCommittee && legacyResponseCount > 0 && (
            <p className="text-body-md text-on-background">
              Sudah ada <b>{legacyResponseCount}</b> respons dengan pertanyaan standar. Begitu kamu menambah pertanyaan
              sendiri, respons itu tidak lagi tampil di rekap, tapi tetap tersimpan dan ikut di ekspor CSV/Excel.
            </p>
          )}
          <form action={startEvaluationFromTemplate} className="self-start">
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="audience" value={audience} />
            <SubmitButton
              successMessage="Template disalin. Silakan edit pertanyaannya."
              className="border border-outline-variant px-4 py-2 rounded-md text-label-caps uppercase tracking-wide hover:bg-surface-container-lowest transition-colors"
            >
              Mulai dari template standar
            </SubmitButton>
          </form>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {questions.map((q, i) => {
          const locked = (answerCounts[q.id] ?? 0) > 0;
          return (
            <form
              key={q.id}
              action={saveEventEvaluationQuestion}
              className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 flex flex-col gap-3"
            >
              <input type="hidden" name="id" value={q.id} />
              <input type="hidden" name="eventId" value={eventId} />
              <input type="hidden" name="audience" value={audience} />
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
                <label className="flex flex-col gap-1">
                  <span className={LABEL}>Pertanyaan {i + 1}</span>
                  <input name="label" defaultValue={q.label} required maxLength={300} className={FIELD} />
                </label>
                <label className="flex flex-col gap-1">
                  <span className={LABEL}>Tipe</span>
                  {/* Select yang disabled tidak ikut terkirim, jadi nilainya dikirim lewat input tersembunyi. */}
                  {locked && <input type="hidden" name="type" value={q.type} />}
                  <Select name="type" defaultValue={q.type} disabled={locked} className="w-full">
                    <TypeOptions />
                  </Select>
                  {locked && (
                    <span className="text-body-sm text-on-surface-variant">
                      Tipe terkunci: {answerCounts[q.id]} jawaban sudah masuk.
                    </span>
                  )}
                </label>
              </div>
              <label className="flex flex-col gap-1">
                <span className={LABEL}>Opsi (satu per baris — untuk Dropdown / Pilihan / Pilih Banyak)</span>
                <textarea
                  name="options"
                  defaultValue={q.options ?? ""}
                  rows={2}
                  placeholder={"Sangat puas\nPuas\nKurang puas"}
                  className={`${FIELD} resize-none`}
                />
              </label>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CheckboxField name="required" defaultChecked={q.required} label="Wajib diisi" />
                <div className="flex items-center gap-2">
                  <SubmitButton
                    successMessage="Pertanyaan tersimpan."
                    className="text-label-caps uppercase tracking-wide border border-outline-variant px-3 py-1.5 rounded-md hover:bg-surface-container-low transition-colors"
                  >
                    Simpan
                  </SubmitButton>
                  <ConfirmButton
                    title="Hapus pertanyaan?"
                    message={`"${q.label}" dihapus dari form evaluasi. Jawaban yang sudah terkumpul tidak ikut terhapus.`}
                    action={deleteEventEvaluationQuestion}
                    payload={{ id: q.id }}
                    className="text-label-caps uppercase tracking-wide text-error hover:bg-error-container/30 px-3 py-1.5 rounded-md"
                  >
                    Hapus
                  </ConfirmButton>
                </div>
              </div>
            </form>
          );
        })}
      </div>

      <form
        action={saveEventEvaluationQuestion}
        className="bg-surface-container-low border border-outline-variant rounded-lg p-4 flex flex-col gap-3"
      >
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="audience" value={audience} />
        <p className="text-label-caps uppercase tracking-wide text-primary-container">+ Tambah Pertanyaan</p>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
          <input
            name="label"
            required
            maxLength={300}
            placeholder="Pertanyaan (mis. Seberapa puas kamu dengan konsumsi?)"
            className={FIELD}
          />
          <Select name="type" defaultValue="rating" className="w-full" aria-label="Tipe pertanyaan">
            <TypeOptions />
          </Select>
        </div>
        <textarea
          name="options"
          rows={2}
          placeholder={"Opsi (satu per baris, hanya untuk Dropdown / Pilihan / Pilih Banyak):\nSangat puas\nPuas\nKurang puas"}
          className={`${FIELD} resize-none`}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CheckboxField name="required" defaultChecked label="Wajib diisi" />
          <SubmitButton
            successMessage="Pertanyaan ditambahkan."
            className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-4 py-2 rounded-md hover:bg-primary transition-colors"
          >
            Tambah
          </SubmitButton>
        </div>
      </form>

      <details className="group rounded-lg border border-outline-variant">
        <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-label-caps uppercase tracking-wide text-on-background">
          <Eye size={16} aria-hidden="true" /> Pratinjau form evaluasi
        </summary>
        <div className="border-t border-outline-variant p-4">
          <EventEvaluationForm
            slug={slug}
            eventTitle={eventTitle}
            cityOptions={cityOptions}
            sections={sections}
            questions={previewQuestions}
            preview
            audience={audience}
          />
        </div>
      </details>
    </div>
  );
}
