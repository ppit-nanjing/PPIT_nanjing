import { asc, count, eq } from "drizzle-orm";
import { AlertCircle, ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { events, formFields, formResponses, type FormRow } from "@/db/schema";
import {
  createFormField,
  createFormFieldFromTemplate,
  deleteFormField,
  duplicateFormField,
  moveFormField,
  updateFormField,
} from "@/app/actions/forms";
import { deleteSurvey, deleteSurveyResponse, updateSurveySettings } from "@/app/actions/survey";
import { CheckboxField, Select, TextAreaField, TextField, ToggleSwitch } from "@/components/console/form";
import { CollapsibleSection } from "@/components/console/collapsible-section";
import { ConfirmButton } from "@/components/console/confirm-button";
import { FormFieldEditor } from "@/components/console/form-field-editor";
import { QuestionBank } from "@/components/console/question-bank";
import { SubmitButton } from "@/components/console/submit-button";
import { CopyButton } from "@/components/copy-button";
import { FormRenderer } from "@/components/forms/form-renderer";
import { ShareButton } from "@/components/share-button";
import { SurveyBiodataBlock } from "@/components/survey/biodata-block";
import { SurveyResultsTable } from "@/components/survey/survey-table";
import { SurveyResultsView } from "@/components/survey/survey-results-view";
import { toChinaLocalInput } from "@/lib/datetime";
import { requireFormManage } from "@/lib/form-access";
import { FIELD_TYPE_LABELS, type MembershipFieldDef } from "@/lib/membership-form";
import { isSheetsConfigured } from "@/lib/google-sheets";
import { getSiteUrl } from "@/lib/site-url";
import {
  SURVEY_BLOCKED_TYPES,
  SURVEY_STATE_LABEL,
  buildSurveyResults,
  isSurveyFieldType,
  surveyOpenState,
  toFieldDef,
} from "@/lib/survey";
import { SURVEY_RESPONSE_LIMIT, loadSurvey, surveyTable } from "@/lib/survey-load";

export const metadata = { title: "Kelola Formulir" };

// Jenis jawaban di "Tambah Pertanyaan". Unggahan berkas/gambar tidak ada (lihat SURVEY_BLOCKED_TYPES).
const ADD_TYPES: MembershipFieldDef["type"][] = [
  "text", "textarea", "email", "tel", "number", "select", "radio", "multiselect", "date", "time", "checkbox",
  "rating", "linear_scale", "grid_radio", "grid_checkbox", "url",
];

const TABS = [
  { key: "pertanyaan", label: "Pertanyaan" },
  { key: "hasil", label: "Hasil" },
  { key: "pengaturan", label: "Pengaturan" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export default async function SurveyManagePage({
  params,
  searchParams,
}: {
  params: Promise<{ formId: string }>;
  searchParams: Promise<{ tab?: string; error?: string }>;
}) {
  const { formId } = await params;
  const sp = await searchParams;
  const { form } = await requireFormManage(formId);
  if (form.kind !== "survei") notFound();

  const tab: TabKey = TABS.some((t) => t.key === sp.tab) ? (sp.tab as TabKey) : "pertanyaan";

  const [fieldRows, eventRows, countRows] = await Promise.all([
    db.select().from(formFields).where(eq(formFields.formId, form.id)).orderBy(asc(formFields.orderIndex)),
    form.eventId
      ? db.select({ title: events.title }).from(events).where(eq(events.id, form.eventId))
      : Promise.resolve([] as { title: string }[]),
    db.select({ n: count() }).from(formResponses).where(eq(formResponses.formId, form.id)),
  ]);
  const fieldDefs = fieldRows.map(toFieldDef);
  // Pertanyaan yang benar-benar bisa dijawab (bagian dan jenis unggahan lama tidak dihitung).
  const answerableCount = fieldDefs.filter((f) => f.type !== "section" && isSurveyFieldType(f.type)).length;
  const eventTitle = eventRows[0]?.title ?? null;
  const responseCount = countRows[0]?.n ?? 0;
  const state = surveyOpenState(form);
  const shareUrl = `${getSiteUrl()}/f/${form.id}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/formulir"
          className="inline-flex items-center gap-2 text-label-caps uppercase tracking-wide text-on-surface-variant hover:text-on-background"
        >
          <ArrowLeft size={16} /> Semua formulir
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <CopyButton value={shareUrl} label="Salin tautan" />
          <ShareButton title={form.title} url={shareUrl} labelKey="forms.share" copiedKey="forms.shareCopied" />
          <Link
            href={`/f/${form.id}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 text-label-caps uppercase tracking-wide text-primary-container hover:text-primary"
          >
            Buka <ExternalLink size={14} aria-hidden />
          </Link>
        </div>
      </div>

      <header>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-headline-md sm:text-headline-lg text-on-background min-w-0 break-words">{form.title}</h1>
          <span
            className={`shrink-0 text-label-caps uppercase tracking-wide px-2 py-1 rounded ${
              state === "open" ? "bg-primary-container/15 text-primary-container" : "bg-surface-container-low text-on-surface-variant"
            }`}
          >
            {SURVEY_STATE_LABEL[state]}
          </span>
        </div>
        <p className="text-body-md text-on-surface-variant mt-1">
          {eventTitle ? `Acara: ${eventTitle}` : "Khusus kabinet"} · {responseCount} jawaban ·{" "}
          {form.allowPublic ? "boleh diisi tanpa login" : "wajib login"}
        </p>
        {state === "open" && answerableCount === 0 && (
          <p className="text-body-sm text-error mt-2">
            Formulir ini dibuka tapi belum punya pertanyaan, jadi belum bisa diisi. Tambahkan pertanyaan di tab Pertanyaan.
          </p>
        )}
        {state !== "open" && (
          <p className="text-body-sm text-on-surface-variant mt-2">
            {form.isOpen
              ? "Formulir dibuka, tapi di luar rentang waktunya. Halaman isi menampilkan keterangan."
              : "Formulir masih ditutup. Buka lewat tab Pengaturan kalau pertanyaannya sudah siap, baru bagikan tautannya."}
          </p>
        )}
      </header>

      <nav aria-label="Bagian formulir" className="flex gap-1 border-b border-outline-variant">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/formulir/${form.id}?tab=${t.key}`}
            aria-current={tab === t.key ? "page" : undefined}
            className={`px-4 py-2.5 text-label-caps uppercase tracking-wide border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? "border-primary-container text-primary-container"
                : "border-transparent text-on-surface-variant hover:text-on-background"
            }`}
          >
            {t.label}
            {t.key === "hasil" && responseCount > 0 && <span className="ml-1.5 text-on-surface-variant">{responseCount}</span>}
          </Link>
        ))}
      </nav>

      {tab === "pertanyaan" && (
        <QuestionsTab formId={form.id} fieldDefs={fieldDefs} collectBiodata={form.collectBiodata} responseCount={responseCount} />
      )}
      {tab === "hasil" && <ResultsTab formId={form.id} collectBiodata={form.collectBiodata} total={responseCount} />}
      {tab === "pengaturan" && <SettingsTab form={form} responseCount={responseCount} error={sp.error} />}
    </div>
  );
}

// ---------- Tab Pertanyaan ----------

function QuestionsTab({
  formId,
  fieldDefs,
  collectBiodata,
  responseCount,
}: {
  formId: string;
  fieldDefs: MembershipFieldDef[];
  collectBiodata: boolean;
  responseCount: number;
}) {
  const questionCount = fieldDefs.filter((f) => f.type !== "section").length;
  return (
    <div className="flex flex-col gap-6">
      <CollapsibleSection
        title="Tambah Pertanyaan"
        description="Tambah satu pertanyaan kosong atau satu bagian baru."
        defaultOpen={questionCount === 0}
      >
        <div className="flex flex-col gap-6">
          <form action={createFormField} className="flex flex-col sm:flex-row sm:items-end gap-3">
            <input type="hidden" name="formId" value={formId} />
            <div className="flex-1">
              <TextField name="label" label="Pertanyaan" placeholder="mis. Seberapa sering kamu membeli makanan Indonesia?" />
            </div>
            <Select
              name="type"
              aria-label="Jenis jawaban"
              options={ADD_TYPES.map((t) => ({ value: t, label: FIELD_TYPE_LABELS[t] }))}
              className="sm:w-56"
            />
            <CheckboxField name="required" label="Wajib diisi" className="sm:pb-3 text-body-md text-on-background" />
            <SubmitButton
              successMessage="Pertanyaan ditambahkan."
              className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-5 py-2.5 rounded-md hover:bg-primary transition-colors disabled:opacity-60"
            >
              Tambah
            </SubmitButton>
          </form>

          <form action={createFormField} className="flex flex-col sm:flex-row sm:items-end gap-3 border-t border-outline-variant pt-5">
            <input type="hidden" name="formId" value={formId} />
            <input type="hidden" name="type" value="section" />
            <div className="flex-1">
              <TextField name="label" label="Tambah Bagian" placeholder="mis. Kebiasaan belanja" />
            </div>
            <SubmitButton
              successMessage="Bagian ditambahkan."
              className="border border-outline-variant text-on-surface-variant text-label-caps uppercase tracking-wide px-5 py-2.5 rounded-md hover:bg-surface-container-low transition-colors disabled:opacity-60"
            >
              Tambah Bagian
            </SubmitButton>
          </form>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Bank Pertanyaan"
        description="Pertanyaan siap pakai. Klik untuk menambahkan ke formulir."
        defaultOpen={false}
      >
        <QuestionBank action={createFormFieldFromTemplate} hiddenFields={{ formId }} excludeTypes={SURVEY_BLOCKED_TYPES} />
      </CollapsibleSection>

      <CollapsibleSection
        title={`Daftar Pertanyaan (${questionCount} pertanyaan)`}
        description="Klik tiap kartu untuk membuka dan menyunting. Seret untuk mengubah urutan."
      >
        {responseCount > 0 && (
          <p className="flex items-start gap-2 text-body-sm text-on-background bg-surface-container-low rounded-md px-3 py-2 mb-4">
            <AlertCircle size={15} className="shrink-0 mt-0.5 text-gold-ink" aria-hidden />
            Sudah ada {responseCount} jawaban. Menghapus pertanyaan menyembunyikan jawabannya dari ringkasan, tabel, dan unduhan.
            Mengubah jenis atau pilihan pertanyaan bisa membuat jawaban lama tidak cocok lagi.
          </p>
        )}
        {fieldDefs.length === 0 ? (
          <p className="text-body-md text-on-surface-variant">
            Belum ada pertanyaan. Tambah dari panel di atas, atau ambil dari Bank Pertanyaan.
          </p>
        ) : (
          <div className="space-y-3">
            {fieldDefs.map((f, i) => {
              let sectionLabel: string | undefined;
              for (let j = i - 1; j >= 0; j--) {
                if (fieldDefs[j].type === "section") {
                  sectionLabel = fieldDefs[j].label;
                  break;
                }
              }
              return (
                <FormFieldEditor
                  key={f.id}
                  field={f}
                  index={i}
                  sectionLabel={sectionLabel}
                  excludeTypes={SURVEY_BLOCKED_TYPES}
                  actions={{
                    update: updateFormField,
                    remove: deleteFormField,
                    move: moveFormField,
                    duplicate: duplicateFormField,
                  }}
                />
              );
            })}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Pratinjau" description="Tampilan yang dilihat responden. Belum bisa dikirim." defaultOpen={false}>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 max-w-2xl">
          <FormRenderer
            formId={formId}
            kind="survei"
            fields={fieldDefs}
            preview
            lead={collectBiodata ? <SurveyBiodataBlock mode="manual" loggedIn={false} /> : undefined}
          />
        </div>
      </CollapsibleSection>
    </div>
  );
}

// ---------- Tab Hasil ----------

async function ResultsTab({
  formId,
  collectBiodata,
  total,
}: {
  formId: string;
  collectBiodata: boolean;
  total: number;
}) {
  // user_id sengaja TIDAK dipilih di loadSurvey: identitas akun tidak pernah sampai ke halaman hasil.
  const loaded = await loadSurvey(formId);
  if (!loaded) notFound();
  const { responses: rows } = loaded;

  const results = buildSurveyResults(loaded.fields, rows);
  const table = surveyTable(loaded);

  return (
    <div className="flex flex-col gap-6">
      {total > SURVEY_RESPONSE_LIMIT && (
        <p className="flex items-start gap-2 text-body-md text-on-background bg-error-container/30 border border-outline-variant rounded-xl px-4 py-3">
          <AlertCircle size={18} className="shrink-0 mt-0.5 text-error" aria-hidden />
          Jawabannya {total}, ringkasan, tabel, dan berkas unduhan hanya memuat {SURVEY_RESPONSE_LIMIT} terbaru.
        </p>
      )}

      <CollapsibleSection title="Ringkasan" description="Grafik per pertanyaan, dihitung dari semua jawaban yang masuk.">
        <SurveyResultsView results={results} total={rows.length} />
      </CollapsibleSection>

      <CollapsibleSection
        title={`Tabel jawaban (${rows.length})`}
        description="Cari, urutkan, buka di Google Sheets, atau unduh sebagai CSV / Excel."
      >
        <SurveyResultsTable table={table} formId={formId} sheetsEnabled={isSheetsConfigured()} />
      </CollapsibleSection>

      {rows.length > 0 && (
        <CollapsibleSection
          title="Hapus jawaban"
          description="Untuk membuang jawaban iseng atau ganda. Jawaban yang dihapus tidak bisa dikembalikan."
          defaultOpen={false}
        >
          <ul className="flex flex-col divide-y divide-outline-variant">
            {rows.slice(0, 100).map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="min-w-0 text-body-md text-on-background truncate">
                  {r.submittedAt.toLocaleString("id-ID", { timeZone: "Asia/Shanghai", dateStyle: "medium", timeStyle: "short" })}
                  {collectBiodata && r.biodata?.fullName ? ` · ${r.biodata.fullName}` : ""}
                </span>
                <ConfirmButton
                  title="Hapus jawaban ini?"
                  message="Jawaban ini dihapus permanen dan tidak ikut dihitung di ringkasan."
                  action={deleteSurveyResponse}
                  payload={{ id: formId, responseId: r.id }}
                  className="text-label-caps uppercase tracking-wide text-error hover:opacity-80 px-3 py-1.5 rounded-md hover:bg-error-container/30 transition-colors"
                >
                  Hapus
                </ConfirmButton>
              </li>
            ))}
          </ul>
          {rows.length > 100 && (
            <p className="text-body-sm text-on-surface-variant mt-3">Menampilkan 100 jawaban terbaru.</p>
          )}
        </CollapsibleSection>
      )}
    </div>
  );
}

// ---------- Tab Pengaturan ----------

function SettingsTab({
  form,
  responseCount,
  error,
}: {
  form: FormRow;
  responseCount: number;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      {error === "dates" && (
        <p role="alert" className="text-body-md text-error bg-error-container/30 rounded-md px-4 py-3">
          Waktu tutup harus sesudah waktu buka. Setelan belum disimpan.
        </p>
      )}

      <CollapsibleSection title="Setelan" description="Judul, siapa yang boleh mengisi, masa buka, dan pesan setelah mengirim.">
        <form action={updateSurveySettings} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={form.id} />
          <TextField name="title" label="Judul formulir" required defaultValue={form.title} />
          <TextAreaField name="description" label="Deskripsi (opsional)" defaultValue={form.description ?? ""} rows={3} />
          <TextField
            name="confirmationMessage"
            label="Pesan setelah mengirim"
            defaultValue={form.confirmationMessage}
            hint="Muncul di halaman setelah responden mengirim jawaban."
          />
          <ToggleSwitch
            name="isOpen"
            label="Buka untuk pengisian"
            defaultChecked={form.isOpen}
            hint="Kalau dimatikan, halaman isi menampilkan keterangan ditutup dan jawaban baru ditolak."
          />
          <ToggleSwitch
            name="allowPublic"
            label="Boleh diisi tanpa login"
            defaultChecked={form.allowPublic}
            hint="Siapa pun yang punya tautan bisa mengisi, dan tidak ada batas satu jawaban per orang (hanya pembatas laju). Kalau mati, responden harus login dan satu akun hanya bisa mengisi sekali."
          />
          <ToggleSwitch
            name="collectBiodata"
            label="Minta biodata responden (nama, universitas, kota)"
            defaultChecked={form.collectBiodata}
            hint="Akun dengan sensus lengkap terisi otomatis dari sensus (hanya tiga isian itu). Selain itu responden mengisi sendiri. Kalau dimatikan, nama tidak ditampilkan di hasil, tapi satu akun tetap hanya bisa mengisi sekali."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextField
              name="opensAt"
              type="datetime-local"
              label="Buka pada (opsional)"
              defaultValue={form.opensAt ? toChinaLocalInput(form.opensAt) : ""}
              hint="Sebelum waktu ini jawaban ditolak. Jam Tiongkok."
            />
            <TextField
              name="closesAt"
              type="datetime-local"
              label="Tutup pada (opsional)"
              defaultValue={form.closesAt ? toChinaLocalInput(form.closesAt) : ""}
              hint="Sesudah waktu ini jawaban ditolak. Jam Tiongkok."
            />
          </div>
          <SubmitButton className="self-start bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-2.5 rounded-md hover:bg-primary transition-colors disabled:opacity-60">
            Simpan Setelan
          </SubmitButton>
        </form>
      </CollapsibleSection>

      <CollapsibleSection title="Hapus formulir" description="Menghapus formulir beserta semua pertanyaan dan jawabannya." defaultOpen={false}>
        <ConfirmButton
          title="Hapus formulir?"
          message={`"${form.title}" beserta SEMUA pertanyaan dan jawabannya (${responseCount}) dihapus permanen. Untuk sekadar menghentikan pengisian, matikan "Buka untuk pengisian" di Setelan.`}
          action={deleteSurvey}
          payload={{ id: form.id }}
          className="text-label-caps uppercase tracking-wide text-error hover:opacity-80 px-4 py-2.5 rounded-md border border-error/40 hover:bg-error-container/30 transition-colors"
        >
          Hapus formulir
        </ConfirmButton>
      </CollapsibleSection>
    </div>
  );
}
