import { CheckboxField, Select } from "@/components/console/form";
import { ConfirmButton } from "@/components/console/confirm-button";
import { SubmitButton } from "@/components/console/submit-button";
import {
  deleteRecruitmentQuestion,
  saveRecruitmentQuestion,
} from "@/app/actions/event-recruitment";
import {
  RECRUIT_QUESTION_TYPE_LABELS,
  RECRUIT_QUESTION_TYPES,
  type RecruitQuestionRow,
} from "@/lib/event-recruitment-questions";

const FIELD = "bg-soft-gray rounded-md p-2.5 text-body-md";
const LABEL = "text-label-caps uppercase tracking-wide text-on-surface-variant";

function TypeOptions() {
  return (
    <>
      {RECRUIT_QUESTION_TYPES.map((value) => (
        <option key={value} value={value}>
          {RECRUIT_QUESTION_TYPE_LABELS[value]}
        </option>
      ))}
    </>
  );
}

export function RecruitmentQuestionsBuilder({
  eventId,
  questions,
}: {
  eventId: string;
  questions: RecruitQuestionRow[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-body-md text-on-surface-variant max-w-2xl">
        Kosong = form rekrutmen panitia memakai form standar (nama, motivasi, divisi minat).
        Begitu ada satu pertanyaan di bawah, form memakai pertanyaan kamu saja.
        Anggota PPIT mengisi lewat <code className="text-on-background">/events/&lt;slug&gt;/daftar-panitia</code>.
      </p>

      <div className="flex flex-col gap-3">
        {questions.map((q, i) => (
          <form
            key={q.id}
            action={saveRecruitmentQuestion}
            className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 flex flex-col gap-3"
          >
            <input type="hidden" name="id" value={q.id} />
            <input type="hidden" name="eventId" value={eventId} />
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
              <label className="flex flex-col gap-1">
                <span className={LABEL}>Pertanyaan {i + 1}</span>
                <input name="label" defaultValue={q.label} required maxLength={300} className={FIELD} />
              </label>
              <label className="flex flex-col gap-1">
                <span className={LABEL}>Tipe</span>
                <Select name="type" defaultValue={q.type} className="w-full">
                  <TypeOptions />
                </Select>
              </label>
            </div>
            <label className="flex flex-col gap-1">
              <span className={LABEL}>Opsi (satu per baris — untuk Dropdown / Pilihan / Pilih Banyak)</span>
              <textarea
                name="options"
                defaultValue={q.options ?? ""}
                rows={2}
                placeholder={"Divisi Acara\nDivisi Humas\nDivisi Logistik"}
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
                  message={`"${q.label}" dihapus dari form rekrutmen.`}
                  action={deleteRecruitmentQuestion}
                  payload={{ id: q.id }}
                  className="text-label-caps uppercase tracking-wide text-error hover:bg-error-container/30 px-3 py-1.5 rounded-md"
                >
                  Hapus
                </ConfirmButton>
              </div>
            </div>
          </form>
        ))}
      </div>

      <form
        action={saveRecruitmentQuestion}
        className="bg-surface-container-low border border-outline-variant rounded-lg p-4 flex flex-col gap-3"
      >
        <input type="hidden" name="eventId" value={eventId} />
        <p className="text-label-caps uppercase tracking-wide text-primary-container">+ Tambah Pertanyaan</p>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
          <input
            name="label"
            required
            maxLength={300}
            placeholder="Pertanyaan (mis. Mengapa kamu ingin jadi panitia?)"
            className={FIELD}
          />
          <Select name="type" defaultValue="text" className="w-full" aria-label="Tipe pertanyaan">
            <TypeOptions />
          </Select>
        </div>
        <textarea
          name="options"
          rows={2}
          placeholder={"Opsi (satu per baris, hanya untuk Dropdown / Pilihan / Pilih Banyak):\nDivisi Acara\nDivisi Humas\nDivisi Logistik"}
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
    </div>
  );
}