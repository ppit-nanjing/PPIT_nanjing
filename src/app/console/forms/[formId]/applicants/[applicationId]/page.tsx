import { and, asc, desc, eq } from "drizzle-orm";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { auditLogs, eventDivisions, events, formApplications, formFields, users } from "@/db/schema";
import { updateApplicationNote, updateApplicationPlacement } from "@/app/actions/forms";
import { requireFormManage } from "@/lib/form-access";
import { CheckboxField, SelectField, TextAreaField } from "@/components/console/form";
import { SubmitButton } from "@/components/console/submit-button";
import { EVENT_COMMITTEE_ROLE_LABEL } from "@/lib/event-capabilities";
import {
  BPH_FORM_ROLE_LABEL,
  BPH_FORM_ROLES,
  FORM_KIND_LABEL,
  FORM_STATUS_LABEL,
  FORM_STATUS_TONE,
  PLACEMENT_ROLE_OPTIONS,
  type FormApplicationStatus,
} from "@/lib/form-types";
import { GRID_TYPES, isSectionType, type MembershipFieldDef } from "@/lib/membership-form";
import { UUID_RE } from "@/lib/uuid";

export const metadata = { title: "Detail Pelamar" };

const ROLE_LABEL: Record<string, string> = { ...BPH_FORM_ROLE_LABEL, ...EVENT_COMMITTEE_ROLE_LABEL };

export default async function FormApplicantPage({
  params,
}: {
  params: Promise<{ formId: string; applicationId: string }>;
}) {
  const { formId, applicationId } = await params;
  const { form } = await requireFormManage(formId);
  if (!UUID_RE.test(applicationId)) notFound();

  const [app] = await db
    .select()
    .from(formApplications)
    .where(and(eq(formApplications.id, applicationId), eq(formApplications.formId, form.id)));
  if (!app) notFound();

  const [fields, divisionRows, eventRows, actorRows, applicantRows] = await Promise.all([
    db.select().from(formFields).where(eq(formFields.formId, form.id)).orderBy(asc(formFields.orderIndex)),
    form.kind === "oprek_kepanitiaan" && form.eventId
      ? db
          .select({ id: eventDivisions.id, name: eventDivisions.name, parentId: eventDivisions.parentDivisionId })
          .from(eventDivisions)
          .where(eq(eventDivisions.eventId, form.eventId))
          .orderBy(asc(eventDivisions.orderIndex))
      : Promise.resolve([] as { id: string; name: string; parentId: string | null }[]),
    form.eventId ? db.select({ title: events.title }).from(events).where(eq(events.id, form.eventId)) : Promise.resolve([]),
    db
      .select({
        action: auditLogs.action,
        beforeJson: auditLogs.beforeJson,
        afterJson: auditLogs.afterJson,
        createdAt: auditLogs.createdAt,
        actorName: users.name,
      })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.actorUserId))
      .where(and(eq(auditLogs.entityType, "form_application"), eq(auditLogs.entityId, app.id)))
      .orderBy(desc(auditLogs.createdAt))
      .limit(10),
    db.select({ email: users.email }).from(users).where(eq(users.id, app.userId)),
  ]);
  const eventTitle = eventRows[0]?.title ?? null;
  const email = applicantRows[0]?.email ?? null;
  const divisionNameById = new Map(divisionRows.map((r) => [r.id, r.name]));
  const status = app.status as FormApplicationStatus;

  const statuses: FormApplicationStatus[] =
    form.kind === "oprek_kepanitiaan"
      ? ["pending", "accepted", "accepted_choice1", "accepted_choice2", "reassigned", "rejected"]
      : ["pending", "accepted", "rejected"];
  const roleChoices: string[] = form.kind === "oprek_bph_acara" ? BPH_FORM_ROLES : PLACEMENT_ROLE_OPTIONS;
  const showRole = form.kind !== "pemilu";
  const showDivision = form.kind === "oprek_kepanitiaan";

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
  const responses = (app.responses ?? {}) as Record<string, unknown>;

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10 max-w-3xl">
      <Link
        href={`/console/forms/${form.id}`}
        className="inline-flex items-center gap-2 text-label-caps uppercase tracking-wide text-on-surface-variant hover:text-on-background mb-4"
      >
        <ArrowLeft size={16} /> Kembali ke form
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <h1 className="text-headline-md sm:text-headline-lg text-on-background">{app.fullName}</h1>
        <span className={`text-label-caps uppercase tracking-wide px-2 py-1 rounded ${FORM_STATUS_TONE[status]}`}>
          {FORM_STATUS_LABEL[status]}
        </span>
      </div>
      <p className="text-body-sm text-on-surface-variant mb-8">
        {FORM_KIND_LABEL[form.kind]}
        {eventTitle ? ` · ${eventTitle}` : ""} &middot; {form.title} &middot;{" "}
        {new Date(app.submittedAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
      </p>

      <section className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 mb-8">
        <h2 className="text-headline-md text-on-background border-b border-outline-variant pb-3 mb-4">Data Pendaftar</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-body-md">
          <div>
            <dt className="text-label-caps uppercase tracking-wide text-on-surface-variant">Nama Lengkap</dt>
            <dd className="text-on-background">{app.fullName}</dd>
          </div>
          <div>
            <dt className="text-label-caps uppercase tracking-wide text-on-surface-variant">Divisi Asal Kabinet</dt>
            <dd className="text-on-background">{app.cabinetDivision}</dd>
          </div>
          {email && (
            <div>
              <dt className="text-label-caps uppercase tracking-wide text-on-surface-variant">Email</dt>
              <dd className="text-on-background break-all">{email}</dd>
            </div>
          )}
          {app.positionApplied && (
            <div>
              <dt className="text-label-caps uppercase tracking-wide text-on-surface-variant">Posisi Dilamar</dt>
              <dd className="text-on-background">{ROLE_LABEL[app.positionApplied] ?? app.positionApplied}</dd>
            </div>
          )}
          {form.kind === "oprek_kepanitiaan" && (
            <div>
              <dt className="text-label-caps uppercase tracking-wide text-on-surface-variant">Pilihan Divisi</dt>
              <dd className="text-on-background">
                1. {app.choice1DivisionId ? divisionNameById.get(app.choice1DivisionId) ?? "—" : "—"}
                <br />
                2. {app.choice2DivisionId ? divisionNameById.get(app.choice2DivisionId) ?? "—" : "—"}
              </dd>
            </div>
          )}
          {["accepted", "accepted_choice1", "accepted_choice2", "reassigned"].includes(status) && app.assignedRole && (
            <div>
              <dt className="text-label-caps uppercase tracking-wide text-on-surface-variant">Penempatan Saat Ini</dt>
              <dd className="text-on-background">
                {ROLE_LABEL[app.assignedRole] ?? app.assignedRole}
                {app.assignedDivisionId
                  ? ` — ${divisionNameById.get(app.assignedDivisionId) ?? ""}`
                  : ""}
              </dd>
            </div>
          )}
        </dl>
      </section>

      <section className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 mb-8">
        <h2 className="text-headline-md text-on-background border-b border-outline-variant pb-3 mb-4">Jawaban</h2>
        {fieldDefs.length === 0 ? (
          <p className="text-body-md text-on-surface-variant">Form ini tidak punya pertanyaan tambahan.</p>
        ) : (
          <div className="flex flex-col gap-5">
            {fieldDefs.map((f) => {
              if (isSectionType(f.type)) {
                return (
                  <h3 key={f.id ?? f.key} className="text-label-caps uppercase tracking-wide text-primary-container border-b border-outline-variant/60 pb-1 mt-2">
                    {f.label}
                  </h3>
                );
              }
              return (
                <div key={f.id ?? f.key}>
                  <p className="text-label-caps uppercase tracking-wide text-on-surface-variant mb-1">{f.label}</p>
                  <AnswerValue field={f} value={responses[f.key]} />
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 mb-8">
        <h2 className="text-headline-md text-on-background border-b border-outline-variant pb-3 mb-4">Penempatan</h2>
        <form action={updateApplicationPlacement} className="flex flex-col gap-4">
          <input type="hidden" name="formId" value={form.id} />
          <input type="hidden" name="applicationId" value={app.id} />
          <SelectField
            name="status"
            label="Status"
            options={statuses.map((s) => ({ value: s, label: FORM_STATUS_LABEL[s] }))}
            defaultValue={status}
          />
          {showRole && (
            <SelectField
              name="assignedRole"
              label="Role Penempatan"
              options={roleChoices.map((r) => ({ value: r, label: ROLE_LABEL[r] ?? r }))}
              defaultValue={app.assignedRole ?? app.positionApplied ?? (form.kind === "oprek_kepanitiaan" ? "anggota" : roleChoices[0])}
              hint={
                form.kind === "oprek_kepanitiaan"
                  ? "Default anggota. Mengubah role ikut mengubah akses fitur acara orang ini."
                  : "Hasil Oprek BPH yang diterima otomatis memegang fitur acara ini."
              }
            />
          )}
          {showDivision && (
            <SelectField
              name="assignedDivisionId"
              label="Divisi (dipakai saat status Dipindah divisi)"
              options={divisionRows.map((d) => ({
                value: d.id,
                label: d.parentId && divisionNameById.has(d.parentId) ? `${divisionNameById.get(d.parentId)} · ${d.name}` : d.name,
              }))}
              defaultValue={app.assignedDivisionId ?? app.choice1DivisionId ?? ""}
              placeholder="— tidak diubah —"
            />
          )}
          <CheckboxField
            name="notifyApplicant"
            defaultChecked
            label="Kirim notifikasi ke pelamar"
            className="text-body-md text-on-background"
          />
          <SubmitButton
            successMessage="Penempatan tersimpan."
            className="self-start bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-2.5 rounded-md hover:bg-primary transition-colors disabled:opacity-60"
          >
            Simpan Penempatan
          </SubmitButton>
        </form>
      </section>

      <section className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 mb-8">
        <h2 className="text-headline-md text-on-background border-b border-outline-variant pb-3 mb-4">Catatan Internal</h2>
        <form action={updateApplicationNote} className="flex flex-col gap-3">
          <input type="hidden" name="formId" value={form.id} />
          <input type="hidden" name="applicationId" value={app.id} />
          <TextAreaField
            name="note"
            label="Catatan (tidak terlihat pelamar)"
            defaultValue={app.note ?? ""}
            rows={3}
          />
          <SubmitButton
            successMessage="Catatan tersimpan."
            className="self-start border border-outline-variant text-on-surface-variant text-label-caps uppercase tracking-wide px-5 py-2.5 rounded-md hover:bg-surface-container-low transition-colors disabled:opacity-60"
          >
            Simpan Catatan
          </SubmitButton>
        </form>
      </section>

      {actorRows.length > 0 && (
        <section className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6">
          <h2 className="text-headline-md text-on-background border-b border-outline-variant pb-3 mb-4">Riwayat Keputusan</h2>
          <ul className="flex flex-col gap-3">
            {actorRows.map((r, i) => {
              const after = (r.afterJson ?? {}) as { status?: string; decisionEmail?: string | null };
              const label = after.status ? FORM_STATUS_LABEL[after.status as FormApplicationStatus] ?? after.status : r.action;
              return (
                <li key={i} className="text-body-sm text-on-surface-variant">
                  <span className="text-on-background">{r.actorName ?? "Pengurus"}</span> &middot; {label}
                  {after.decisionEmail === "sent" ? " · notifikasi terkirim" : after.decisionEmail === "skipped" ? " · tanpa notifikasi" : after.decisionEmail ? " · notifikasi gagal" : ""}{" "}
                  &middot; {new Date(r.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

// Render jawaban sesuai tipe field (bentuk penyimpanan mengikuti renderer:
// grid = objek {rowIndex: value|string[]}, multiselect = array, checkbox = boolean).
function AnswerValue({ field, value }: { field: MembershipFieldDef; value: unknown }) {
  if (value === undefined || value === null || value === "") {
    return <p className="text-body-md text-on-surface-variant">—</p>;
  }

  if (GRID_TYPES.includes(field.type)) {
    const map = (typeof value === "object" && !Array.isArray(value) ? value : {}) as Record<string, string | string[]>;
    const rows = field.config?.rows ?? [];
    return (
      <ul className="flex flex-col gap-1 text-body-md text-on-background">
        {rows.map((row, i) => {
          const ans = map[String(i)];
          if (!ans || (Array.isArray(ans) && ans.length === 0)) return null;
          return (
            <li key={i}>
              <span className="text-on-surface-variant">{row}:</span> {Array.isArray(ans) ? ans.join(", ") : ans}
            </li>
          );
        })}
        {Object.keys(map).length === 0 && <li className="text-on-surface-variant">—</li>}
      </ul>
    );
  }

  if (field.type === "multiselect" && Array.isArray(value)) {
    return <p className="text-body-md text-on-background">{value.join(", ")}</p>;
  }

  if (field.type === "checkbox") {
    return <p className="text-body-md text-on-background">{value === true || value === "true" ? "Ya" : "Tidak"}</p>;
  }

  if (field.type === "file" || field.type === "image") {
    const url = String(value);
    // Hanya lampiran privat internal atau URL http(s) yang dirender sebagai
    // tautan — nilai lain (mis. skema aneh) tampil teks saja.
    const safeLink = url.startsWith("/api/files/") || /^https?:\/\//i.test(url);
    if (!safeLink) {
      return <p className="text-body-md text-on-background break-all">{url}</p>;
    }
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-body-md text-primary-container underline break-all"
      >
        Buka lampiran <ExternalLink size={13} aria-hidden />
      </a>
    );
  }

  return <p className="text-body-md text-on-background whitespace-pre-wrap">{String(value)}</p>;
}
