import { asc, count, desc, eq } from "drizzle-orm";
import { AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { db } from "@/db";
import { eventDivisions, events, formApplications, formFields } from "@/db/schema";
import {
  createFormField,
  createFormFieldFromTemplate,
  deleteForm,
  deleteFormField,
  duplicateFormField,
  moveFormField,
  updateFormField,
  updateFormSettings,
} from "@/app/actions/forms";
import { requireFormManage } from "@/lib/form-access";
import { CollapsibleSection } from "@/components/console/collapsible-section";
import { ConfirmButton } from "@/components/console/confirm-button";
import { CopyButton } from "@/components/copy-button";
import { ShareButton } from "@/components/share-button";
import { FormFieldEditor } from "@/components/console/form-field-editor";
import { FormAnalyticsView } from "@/components/console/forms/form-analytics-view";
import { FormRenderer, type FormDivisionOption } from "@/components/forms/form-renderer";
import { QuestionBank } from "@/components/console/question-bank";
import { CheckboxField, Select, TextAreaField, TextField, ToggleSwitch } from "@/components/console/form";
import { SubmitButton } from "@/components/console/submit-button";
import { EVENT_COMMITTEE_ROLE_LABEL } from "@/lib/event-capabilities";
import { buildFormAnalytics } from "@/lib/form-analytics";
import { BPH_FORM_ROLE_LABEL, BPH_FORM_ROLES, FORM_KIND_LABEL, FORM_STATUS_LABEL, FORM_STATUS_TONE, FORM_TAB_PATH, isDivisionOprekKind } from "@/lib/form-types";
import { toChinaLocalInput } from "@/lib/datetime";
import { FIELD_TYPE_LABELS, type MembershipFieldDef } from "@/lib/membership-form";
import { getSiteUrl } from "@/lib/site-url";
import type { FormApplicationStatus } from "@/lib/form-types";

export const metadata = { title: "Kelola Formulir" };

const ADD_TYPES: MembershipFieldDef["type"][] = [
  "text", "textarea", "email", "tel", "number", "select", "radio", "multiselect", "date", "checkbox", "rating", "image", "url",
];

export default async function FormManagePage({ params }: { params: Promise<{ formId: string }> }) {
  const { formId } = await params;
  const { form } = await requireFormManage(formId);

  const [fields, eventRows, applicantCountRows, divisionRows, applications] = await Promise.all([
    db.select().from(formFields).where(eq(formFields.formId, form.id)).orderBy(asc(formFields.orderIndex)),
    form.eventId
      ? db
          .select({ id: events.id, title: events.title, status: events.status })
          .from(events)
          .where(eq(events.id, form.eventId))
      : Promise.resolve([] as { id: string; title: string; status: string }[]),
    db.select({ n: count() }).from(formApplications).where(eq(formApplications.formId, form.id)),
    isDivisionOprekKind(form.kind) && form.eventId
      ? db
          .select({ id: eventDivisions.id, name: eventDivisions.name, parentId: eventDivisions.parentDivisionId })
          .from(eventDivisions)
          .where(eq(eventDivisions.eventId, form.eventId))
          .orderBy(asc(eventDivisions.orderIndex))
      : Promise.resolve([] as { id: string; name: string; parentId: string | null }[]),
    db
      .select({
        id: formApplications.id,
        fullName: formApplications.fullName,
        cabinetDivision: formApplications.cabinetDivision,
        positionApplied: formApplications.positionApplied,
        choice1DivisionId: formApplications.choice1DivisionId,
        choice2DivisionId: formApplications.choice2DivisionId,
        assignedDivisionId: formApplications.assignedDivisionId,
        responses: formApplications.responses,
        status: formApplications.status,
        submittedAt: formApplications.submittedAt,
      })
      .from(formApplications)
      .where(eq(formApplications.formId, form.id))
      .orderBy(desc(formApplications.submittedAt)),
  ]);
  const event = eventRows[0] ?? null;
  const applicantCount = applicantCountRows[0]?.n ?? 0;
  const back = FORM_TAB_PATH[form.kind];

  const divisionNameById = new Map(divisionRows.map((r) => [r.id, r.name]));
  const previewDivisions: FormDivisionOption[] = divisionRows.map((r) => ({
    id: r.id,
    name: r.parentId && divisionNameById.has(r.parentId) ? `${divisionNameById.get(r.parentId)} · ${r.name}` : r.name,
  }));
  const fieldDefs: MembershipFieldDef[] = fields.map((r) => ({
    id: r.id,
    key: r.key,
    label: r.label,
    type: r.type as MembershipFieldDef["type"],
    placeholder: r.placeholder ?? undefined,
    helpText: r.helpText ?? undefined,
    required: r.required,
    options: r.options ? r.options.split("\n").map((s) => s.trim()).filter(Boolean) : undefined,
    config: (r.config as MembershipFieldDef["config"]) ?? undefined,
    isCore: false,
  }));
  const roleLabels: Record<string, string> = { ...BPH_FORM_ROLE_LABEL, ...EVENT_COMMITTEE_ROLE_LABEL };
  const analytics = buildFormAnalytics({
    applications: applications.map((a) => ({
      status: a.status,
      positionApplied: a.positionApplied,
      choice1DivisionId: a.choice1DivisionId,
      choice2DivisionId: a.choice2DivisionId,
      responses: a.responses,
    })),
    fields: fieldDefs.map((f) => ({ key: f.key, label: f.label, type: f.type })),
    divisionNameById,
    statusLabel: (s) => FORM_STATUS_LABEL[s as FormApplicationStatus] ?? s,
    roleLabel: (r) => roleLabels[r] ?? r,
  });

  return (
    // Lebih lebar dari halaman console biasa: Bank Pertanyaan & daftar pertanyaan
    // butuh ruang supaya label panjang tidak terpotong.
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10 max-w-5xl">
      <div className="flex items-center justify-between gap-3 mb-4">
        <Link
          href={back}
          className="inline-flex items-center gap-2 text-label-caps uppercase tracking-wide text-on-surface-variant hover:text-on-background"
        >
          <ArrowLeft size={16} /> Kembali
        </Link>
        <div className="flex items-center gap-3">
          <CopyButton value={`${getSiteUrl()}/forms/${form.id}`} label="Salin tautan" />
          <ShareButton
            title={form.title}
            url={`${getSiteUrl()}/forms/${form.id}`}
            labelKey="forms.share"
            copiedKey="forms.shareCopied"
          />
          {applicantCount > 0 && (
            <>
              <a
                href={`/api/console/forms/${form.id}/export?format=csv`}
                className="text-label-caps uppercase tracking-wide text-primary-container hover:text-primary"
              >
                CSV
              </a>
              <a
                href={`/api/console/forms/${form.id}/export?format=xlsx`}
                className="text-label-caps uppercase tracking-wide text-primary-container hover:text-primary"
              >
                Excel
              </a>
            </>
          )}
          <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">{applicantCount} pendaftar</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-headline-md sm:text-headline-lg text-on-background truncate">{form.title}</h1>
          <span className="shrink-0 text-label-caps uppercase tracking-wide bg-surface-container-low text-on-surface-variant px-2 py-1 rounded">
            {FORM_KIND_LABEL[form.kind]}
          </span>
          <span
            className={`shrink-0 text-label-caps uppercase tracking-wide px-2 py-1 rounded ${
              form.isOpen ? "bg-primary-container/15 text-primary-container" : "bg-surface-container-low text-on-surface-variant"
            }`}
          >
            {form.isOpen ? "Dibuka" : "Tutup"}
          </span>
        </div>
        <ConfirmButton
          title="Hapus formulir?"
          message={`"${form.title}" beserta SEMUA jawaban pendaftarnya (${applicantCount}) dihapus permanen. Untuk sekadar menghentikan pendaftaran, pakai toggle "Buka untuk pengisian" di Setelan.`}
          action={deleteForm}
          payload={{ id: form.id }}
          className="text-label-caps uppercase tracking-wide text-error hover:opacity-80 px-3 py-2 rounded-md hover:bg-error-container/30 transition-colors"
        >
          Hapus
        </ConfirmButton>
      </div>

      {event && (
        <p className="text-body-md text-on-surface-variant mb-2">
          Acara: <span className="text-on-background">{event.title}</span>
          {event.status === "completed" || event.status === "cancelled" ? " (selesai)" : ""}
        </p>
      )}
      <p className="text-body-sm text-on-surface-variant mb-6">
        {form.isOpen
          ? "Bagikan tautan halaman isi ke grup — penerima wajib login sebagai pengurus kabinet."
          : "Form masih ditutup; halaman isinya hanya menampilkan keterangan ditutup. Jangan bagikan dulu."}
      </p>

      {isDivisionOprekKind(form.kind) && previewDivisions.length === 0 && (
        // Tanpa divisi kepanitiaan, pelamar tidak punya pilihan divisi dan form
        // tidak bisa dikirim — ingatkan pengelola sebelum tautannya disebar.
        <div className="flex items-start gap-2 bg-error-container/30 border border-outline-variant rounded-xl px-4 py-3 mb-6">
          <AlertCircle size={18} className="shrink-0 mt-0.5 text-error" aria-hidden />
          <p className="text-body-md text-on-background">
            Acara ini belum punya divisi kepanitiaan, jadi pelamar belum bisa mengirim formulir ini. Buat divisinya dulu di{" "}
            {form.eventId ? (
              <Link href={`/console/events/${form.eventId}`} className="text-primary-container underline">
                halaman acara → Struktur Kepanitiaan
              </Link>
            ) : (
              "halaman acara → Struktur Kepanitiaan"
            )}
            .
          </p>
        </div>
      )}

      <CollapsibleSection title="Setelan" description="Judul, deskripsi, masa buka, dan pesan setelah mengirim.">
        <form action={updateFormSettings} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={form.id} />
          <TextField name="title" label="Judul formulir" required defaultValue={form.title} />
          <TextAreaField name="description" label="Deskripsi (opsional)" defaultValue={form.description ?? ""} rows={3} />
          <TextField
            name="confirmationMessage"
            label="Pesan setelah mengirim"
            defaultValue={form.confirmationMessage}
            hint="Muncul di layar selesai/halaman setelah pelamar mengirim jawaban."
          />
          <ToggleSwitch
            name="isOpen"
            label="Buka untuk pengisian"
            defaultChecked={form.isOpen}
            hint="Kalau dimatikan, pelamar tidak bisa mengirim (halaman isi menampilkan keterangan ditutup)."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextField
              name="opensAt"
              type="datetime-local"
              label="Buka pada (opsional)"
              defaultValue={form.opensAt ? toChinaLocalInput(form.opensAt) : ""}
              hint="Hanya informasi; membuka form tetap lewat toggle di atas. Jam Tiongkok."
            />
            <TextField
              name="closesAt"
              type="datetime-local"
              label="Tutup pada (opsional)"
              defaultValue={form.closesAt ? toChinaLocalInput(form.closesAt) : ""}
              hint="Hanya informasi; menutup form tetap lewat toggle di atas. Jam Tiongkok."
            />
          </div>

          {form.kind === "oprek_bph_acara" && (
            <fieldset className="flex flex-col gap-2">
              <legend className="text-label-caps uppercase tracking-wide text-on-surface-variant mb-1">
                Posisi BPH Acara yang dibuka
              </legend>
              {BPH_FORM_ROLES.map((role) => (
                <CheckboxField
                  key={role}
                  name="bphRole"
                  value={role}
                  defaultChecked={form.bphRoles.includes(role)}
                  label={BPH_FORM_ROLE_LABEL[role] ?? role}
                  className="text-body-md text-on-background"
                />
              ))}
            </fieldset>
          )}

          <SubmitButton className="self-start bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-2.5 rounded-md hover:bg-primary transition-colors disabled:opacity-60">
            Simpan Setelan
          </SubmitButton>
        </form>
      </CollapsibleSection>

      <CollapsibleSection
        title={`Pendaftar (${applicantCount})`}
        description="Klik satu pelamar untuk meninjau jawaban dan mengatur penempatan."
        className="mt-8"
      >
        {applications.length === 0 ? (
          <p className="text-body-md text-on-surface-variant">Belum ada yang mendaftar.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {applications.map((a) => {
              const status = a.status as FormApplicationStatus;
              const positionLabel = a.positionApplied
                ? (BPH_FORM_ROLE_LABEL[a.positionApplied] ?? a.positionApplied)
                : null;
              const choiceNames = [a.choice1DivisionId, a.choice2DivisionId]
                .map((cid) => (cid ? divisionNameById.get(cid) : null))
                .filter(Boolean)
                .join(" / ");
              const summary = positionLabel ?? (choiceNames || null);
              return (
                <li key={a.id}>
                  <Link
                    href={`/console/forms/${form.id}/applicants/${a.id}`}
                    className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border border-outline-variant rounded-lg px-4 py-3 hover:bg-surface-container-low transition-colors"
                  >
                    <span className="min-w-0">
                      <span className="block text-body-md text-on-background truncate">{a.fullName}</span>
                      <span className="block text-body-sm text-on-surface-variant truncate">
                        {a.cabinetDivision}
                        {summary ? ` · ${summary}` : ""} &middot;{" "}
                        {new Date(a.submittedAt).toLocaleDateString("id-ID", { dateStyle: "medium" })}
                      </span>
                    </span>
                    <span
                      className={`text-label-caps uppercase tracking-wide px-2 py-1 rounded shrink-0 ${FORM_STATUS_TONE[status]}`}
                    >
                      {FORM_STATUS_LABEL[status]}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Analitik"
        description="Ringkasan status, posisi/divisi pilihan, dan pertanyaan pilihan."
        className="mt-8"
        defaultOpen={false}
      >
        <FormAnalyticsView analytics={analytics} kind={form.kind} />
      </CollapsibleSection>

      <CollapsibleSection
        title="Tambah Pertanyaan"
        description="Tambah satu pertanyaan kosong atau satu bagian/tahap baru."
        className="mt-8"
        defaultOpen={false}
      >
        <div className="flex flex-col gap-6">
          <form action={createFormField} className="flex flex-col sm:flex-row sm:items-end gap-3">
            <input type="hidden" name="formId" value={form.id} />
            <div className="flex-1">
              <TextField name="label" label="Pertanyaan" placeholder="mis. Alasan memilih divisi ini" />
            </div>
            <Select
              name="type"
              aria-label="Jenis jawaban"
              options={ADD_TYPES.map((t) => ({ value: t, label: FIELD_TYPE_LABELS[t] }))}
              className="sm:w-56"
            />
            <CheckboxField name="required" label="Wajib diisi" className="sm:pb-3 text-body-md text-on-background" />
            <SubmitButton className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-5 py-2.5 rounded-md hover:bg-primary transition-colors disabled:opacity-60">
              Tambah
            </SubmitButton>
          </form>

          <form action={createFormField} className="flex flex-col sm:flex-row sm:items-end gap-3 border-t border-outline-variant pt-5">
            <input type="hidden" name="formId" value={form.id} />
            <input type="hidden" name="type" value="section" />
            <div className="flex-1">
              <TextField name="label" label="Tambah Bagian / Tahap" placeholder="mis. Pengalaman Organisasi" />
            </div>
            <SubmitButton className="border border-outline-variant text-on-surface-variant text-label-caps uppercase tracking-wide px-5 py-2.5 rounded-md hover:bg-surface-container-low transition-colors disabled:opacity-60">
              Tambah Bagian
            </SubmitButton>
          </form>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Bank Pertanyaan"
        description="Pertanyaan siap pakai &mdash; klik untuk menambahkan ke formulir."
        className="mt-8"
        defaultOpen={false}
      >
        <QuestionBank action={createFormFieldFromTemplate} hiddenFields={{ formId: form.id }} />
      </CollapsibleSection>

      <CollapsibleSection
        title={`Daftar Pertanyaan (${fieldDefs.filter((f) => f.type !== "section").length} pertanyaan)`}
        description="Klik tiap kartu untuk membuka/menyusun. Tanda ▸ berarti tertutup."
        className="mt-8"
      >
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

      <CollapsibleSection
        title="Pratinjau Formulir"
        description="Tampilan yang dilihat pelamar (kolom identitas memakai contoh). Belum bisa dikirim."
        className="mt-8"
        defaultOpen={false}
      >
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 max-w-2xl">
          <FormRenderer
            formId={form.id}
            kind={form.kind}
            fields={fieldDefs}
            bphRoles={form.bphRoles}
            divisions={previewDivisions}
            prefill={{ fullName: "Nama Pengurus (contoh)", divisionName: "Divisi Asal (contoh)" }}
            preview
          />
        </div>
      </CollapsibleSection>
    </div>
  );
}
