"use server";

import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import {
  auditLogs,
  eventCommittee,
  eventDivisions,
  events,
  formApplications,
  formFields,
  forms,
  notificationTemplates,
  users,
} from "@/db/schema";
import { parseChinaLocalInput } from "@/lib/datetime";
import { sendEmail } from "@/lib/email";
import { getTemplateDef, renderTemplate, type NotificationTemplateKey } from "@/lib/notification-templates";
import { createTemplatedNotification } from "@/lib/notifications";
import { renderMembershipEmail, renderMembershipEmailText } from "@/lib/membership-email";
import { canPlaceApplicant, getCabinetMembership, getFormsAccess, requireFormManage } from "@/lib/form-access";
import { EVENT_COMMITTEE_ROLE_LABEL, isBphPanitiaRole, type EventCommitteeRole } from "@/lib/event-capabilities";
import { BPH_FORM_ROLE_LABEL, BPH_FORM_ROLES, FORM_TAB_PATH, PLACEMENT_ROLE_OPTIONS, type FormKind } from "@/lib/form-types";
import { FIELD_TYPE_LABELS, GRID_TYPES, QUESTION_BY_KEY, type MembershipFieldDef } from "@/lib/membership-form";
import { scrubForeignPrivateUrl } from "@/lib/private-files";
import { UUID_RE } from "@/lib/uuid";

// Server Actions modul Formulir (Pemilu, Oprek BPH Acara, Oprek Kepanitiaan).
// Setiap aksi memeriksa hak aksesnya sendiri di server (requireFormManage /
// gerbang tab) — UI bukan kontrol akses. Aksi builder (field) menerima FormData
// dari komponen FormFieldEditor/QuestionBank yang dipakai bersama membership.

const FIELD_TYPE_KEYS = Object.keys(FIELD_TYPE_LABELS) as MembershipFieldDef["type"][];

const FORM_KINDS: FormKind[] = ["pemilu", "oprek_bph_acara", "oprek_kepanitiaan"];

function tabPath(kind: FormKind): string {
  return FORM_TAB_PATH[kind];
}

function revalidateFormPaths(formId: string, kind: FormKind) {
  revalidatePath("/console/forms");
  revalidatePath(`/console/forms/${formId}`);
  revalidatePath(tabPath(kind));
  // Halaman isi publik (Fase 3) — aman dipanggil walau belum ada.
  revalidatePath(`/forms/${formId}`);
}

function parseLocalDate(value: FormDataEntryValue | null): Date | null {
  // Nilai datetime-local dibaca sebagai jam Tiongkok (server Vercel di UTC) —
  // helper yang sama dengan jendela evaluasi panitia.
  return parseChinaLocalInput(String(value ?? ""));
}

function randomKey(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

// ---- Form (CRUD) ----

export async function createForm(formData: FormData) {
  const access = await getFormsAccess();
  if (!access) redirect("/login");

  const kindRaw = String(formData.get("kind") ?? "");
  if (!FORM_KINDS.includes(kindRaw as FormKind)) redirect("/console/forms");
  const kind = kindRaw as FormKind;
  const back = tabPath(kind);

  if (kind === "pemilu" && !access.canPemilu) redirect("/console/forms");
  if (kind === "oprek_bph_acara" && !access.canBphTab) redirect("/console/forms");
  if (kind === "oprek_kepanitiaan" && !access.canKepanitiaanTab) redirect("/console/forms");

  const title = String(formData.get("title") ?? "").trim();
  if (!title) redirect(`${back}?error=title`);

  let eventId: string | null = null;
  if (kind !== "pemilu") {
    eventId = String(formData.get("eventId") ?? "").trim() || null;
    if (!eventId || !UUID_RE.test(eventId)) redirect(`${back}?error=event`);
    const [event] = await db.select({ id: events.id }).from(events).where(eq(events.id, eventId));
    if (!event) redirect(`${back}?error=event`);
    // Oprek Kepanitiaan hanya untuk acara tempat dia BPH Acara (kecuali full/modul).
    if (
      kind === "oprek_kepanitiaan" &&
      !access.isFull &&
      !access.canForms &&
      !access.bphEventIds.includes(eventId)
    ) {
      redirect("/console/forms");
    }
  }

  const bphRoles =
    kind === "oprek_bph_acara"
      ? formData
          .getAll("bphRole")
          .map((r) => String(r))
          .filter((r) => (BPH_FORM_ROLES as string[]).includes(r))
      : [];
  if (kind === "oprek_bph_acara" && bphRoles.length === 0) redirect(`${back}?error=roles`);

  const [created] = await db
    .insert(forms)
    .values({ kind, eventId, title, bphRoles, createdBy: access.userId })
    .returning({ id: forms.id });

  revalidatePath("/console/forms");
  revalidatePath(back);
  redirect(`/console/forms/${created.id}`);
}

export async function updateFormSettings(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const { form } = await requireFormManage(id);

  const titleInput = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const confirmationMessage = String(formData.get("confirmationMessage") ?? "").trim();
  const isOpen = formData.get("isOpen") === "on";
  const opensAt = parseLocalDate(formData.get("opensAt"));
  const closesAt = parseLocalDate(formData.get("closesAt"));

  const openedRoles =
    form.kind === "oprek_bph_acara"
      ? formData
          .getAll("bphRole")
          .map((r) => String(r))
          .filter((r) => (BPH_FORM_ROLES as string[]).includes(r))
      : form.bphRoles;
  // Form BPH tanpa posisi apa pun tidak bisa dipakai — kalau semua centang
  // dilepas, pertahankan setelan sebelumnya.
  const bphRoles = form.kind === "oprek_bph_acara" && openedRoles.length === 0 ? form.bphRoles : openedRoles;

  await db
    .update(forms)
    .set({
      title: titleInput || form.title,
      description: description || null,
      confirmationMessage: confirmationMessage || "Terima kasih! Jawabanmu sudah kami terima.",
      isOpen,
      opensAt,
      closesAt,
      bphRoles,
      updatedAt: new Date(),
    })
    .where(eq(forms.id, form.id));

  revalidateFormPaths(form.id, form.kind);
}

export async function deleteForm(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const { form } = await requireFormManage(id);
  await db.delete(forms).where(eq(forms.id, form.id));
  revalidatePath("/console/forms");
  revalidatePath(tabPath(form.kind));
  redirect(tabPath(form.kind));
}

// ---- Builder: field (dipakai FormFieldEditor & QuestionBank bersama) ----

async function nextOrderIndex(formId: string): Promise<number> {
  const rows = await db
    .select({ o: formFields.orderIndex })
    .from(formFields)
    .where(eq(formFields.formId, formId))
    .orderBy(asc(formFields.orderIndex));
  return rows.length ? Math.max(...rows.map((r) => r.o)) + 1 : 0;
}

async function loadFieldForManage(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!UUID_RE.test(id)) throw new Error("Pertanyaan tidak ditemukan.");
  const [field] = await db.select().from(formFields).where(eq(formFields.id, id));
  if (!field) throw new Error("Pertanyaan tidak ditemukan.");
  const { form } = await requireFormManage(field.formId);
  return { field, form };
}

export async function createFormField(formData: FormData) {
  const formId = String(formData.get("formId") ?? "");
  const { form } = await requireFormManage(formId);
  const label = String(formData.get("label") ?? "").trim() || "Pertanyaan baru";
  const typeRaw = String(formData.get("type") ?? "text");
  const type = FIELD_TYPE_KEYS.includes(typeRaw as MembershipFieldDef["type"])
    ? (typeRaw as MembershipFieldDef["type"])
    : "text";

  await db.insert(formFields).values({
    formId: form.id,
    key: randomKey("custom"),
    label,
    type,
    required: formData.get("required") === "on",
    orderIndex: await nextOrderIndex(form.id),
  });
  revalidateFormPaths(form.id, form.kind);
}

export async function createFormFieldFromTemplate(formData: FormData) {
  const formId = String(formData.get("formId") ?? "");
  const { form } = await requireFormManage(formId);
  const templateKey = String(formData.get("templateKey") ?? "");
  const tpl = QUESTION_BY_KEY[templateKey];
  if (!tpl) throw new Error("Template tidak ditemukan");

  await db.insert(formFields).values({
    formId: form.id,
    key: randomKey(`tpl_${templateKey}`),
    label: tpl.label,
    type: tpl.type,
    placeholder: tpl.placeholder ?? null,
    helpText: tpl.helpText ?? null,
    required: tpl.required ?? false,
    options: tpl.options ? tpl.options.join("\n") : null,
    config: (tpl.config as Record<string, unknown> | undefined) ?? null,
    orderIndex: await nextOrderIndex(form.id),
  });
  revalidateFormPaths(form.id, form.kind);
}

export async function updateFormField(formData: FormData) {
  const { field, form } = await loadFieldForManage(formData);
  const label = String(formData.get("label") ?? "").trim();
  const typeRaw = String(formData.get("type") ?? "text");
  const type = FIELD_TYPE_KEYS.includes(typeRaw as MembershipFieldDef["type"])
    ? (typeRaw as MembershipFieldDef["type"])
    : "text";
  const required = formData.get("required") === "on";
  const placeholder = String(formData.get("placeholder") ?? "").trim();
  const helpText = String(formData.get("helpText") ?? "").trim();
  const options = String(formData.get("options") ?? "").trim();
  const configRaw = String(formData.get("config") ?? "").trim();
  let config: MembershipFieldDef["config"] | null = null;
  if (configRaw) {
    try {
      const parsed = JSON.parse(configRaw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        config = parsed as MembershipFieldDef["config"];
      }
    } catch {
      // config rusak diabaikan (pola sama dengan membership)
    }
  }

  await db
    .update(formFields)
    .set({
      label,
      type,
      required,
      placeholder: placeholder || null,
      helpText: helpText || null,
      options: options || null,
      config: (config as Record<string, unknown> | null) ?? null,
    })
    .where(eq(formFields.id, field.id));
  revalidateFormPaths(form.id, form.kind);
}

export async function deleteFormField(formData: FormData) {
  const { field, form } = await loadFieldForManage(formData);
  await db.delete(formFields).where(eq(formFields.id, field.id));
  revalidateFormPaths(form.id, form.kind);
}

// Dipanggil komponen klien (drag & drop) — argumen serializable, bukan FormData.
export async function moveFormField(id: string, toIndex: number) {
  if (!UUID_RE.test(id)) return;
  const [field] = await db.select().from(formFields).where(eq(formFields.id, id));
  if (!field) return;
  const { form } = await requireFormManage(field.formId);

  const rows = await db
    .select()
    .from(formFields)
    .where(eq(formFields.formId, form.id))
    .orderBy(asc(formFields.orderIndex));
  const from = rows.findIndex((r) => r.id === id);
  if (from < 0) return;
  const [moved] = rows.splice(from, 1);
  const clamped = Math.max(0, Math.min(toIndex, rows.length));
  rows.splice(clamped, 0, moved);
  await db.transaction(async (tx) => {
    for (let i = 0; i < rows.length; i++) {
      await tx.update(formFields).set({ orderIndex: i }).where(eq(formFields.id, rows[i].id));
    }
  });
  revalidateFormPaths(form.id, form.kind);
}

export async function duplicateFormField(id: string) {
  if (!UUID_RE.test(id)) return;
  const [src] = await db.select().from(formFields).where(eq(formFields.id, id));
  if (!src) return;
  const { form } = await requireFormManage(src.formId);

  // orderIndex = integer: JANGAN menyisipkan nilai pecahan (0.5) — Postgres
  // menolaknya. Sisipkan di posisi integer berikutnya, lalu susun ulang seluruh
  // daftar secara eksplisit: klon diletakkan tepat setelah sumbernya.
  const [created] = await db
    .insert(formFields)
    .values({
      formId: form.id,
      key: randomKey("custom"),
      label: `${src.label} (salinan)`,
      type: src.type,
      placeholder: src.placeholder,
      helpText: src.helpText,
      required: src.required,
      options: src.options,
      config: src.config,
      orderIndex: src.orderIndex + 1,
    })
    .returning({ id: formFields.id });

  const all = await db
    .select({ id: formFields.id })
    .from(formFields)
    .where(eq(formFields.formId, form.id))
    .orderBy(asc(formFields.orderIndex));
  const ids = all.map((r) => r.id).filter((rowId) => rowId !== created.id);
  const srcIdx = ids.indexOf(src.id);
  if (srcIdx >= 0) ids.splice(srcIdx + 1, 0, created.id);
  else ids.push(created.id);

  await db.transaction(async (tx) => {
    for (let i = 0; i < ids.length; i++) {
      await tx.update(formFields).set({ orderIndex: i }).where(eq(formFields.id, ids[i]));
    }
  });
  revalidateFormPaths(form.id, form.kind);
}

// ---- Pengisian (halaman /forms/[id]) ----

// Aksi submit formulir kabinet. Semua pengecekan diulang di server: login,
// keanggotaan kabinet (bukan cuma halaman), status buka, posisi BPH dari daftar
// yang dibuka, divisi benar milik acara, dan pertanyaan wajib.
export async function submitFormApplication(formData: FormData) {
  const formId = String(formData.get("formId") ?? "");
  if (!UUID_RE.test(formId)) redirect("/console");

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect(`/login?returnTo=${encodeURIComponent(`/forms/${formId}`)}`);

  const [form] = await db.select().from(forms).where(eq(forms.id, formId));
  if (!form) redirect("/console");
  const back = `/forms/${form.id}`;

  const membership = await getCabinetMembership(userId);
  if (!membership || !membership.isCabinetMember) redirect(`${back}?error=forbidden`);

  const [existing] = await db
    .select({ id: formApplications.id })
    .from(formApplications)
    .where(and(eq(formApplications.formId, form.id), eq(formApplications.userId, userId)));
  if (existing) redirect(`${back}/submitted`);
  // Cek setelah existing supaya orang yang sudah pernah kirim tetap bisa lihat
  // statusnya walau formnya sudah ditutup.
  if (!form.isOpen) redirect(`${back}?error=closed`);

  // Kolom sistem per jenis form.
  let positionApplied: string | null = null;
  let choice1: string | null = null;
  let choice2: string | null = null;

  async function divisionBelongsToEvent(divisionId: string): Promise<boolean> {
    if (!form.eventId) return false;
    const rows = await db
      .select({ id: eventDivisions.id })
      .from(eventDivisions)
      .where(and(eq(eventDivisions.id, divisionId), eq(eventDivisions.eventId, form.eventId)));
    return rows.length > 0;
  }

  if (form.kind === "oprek_bph_acara") {
    const pos = String(formData.get("sys_position") ?? "").trim();
    if (!pos || !(form.bphRoles as string[]).includes(pos)) redirect(`${back}?error=submit`);
    positionApplied = pos;
  }
  if (form.kind === "oprek_kepanitiaan") {
    const c1 = String(formData.get("sys_choice1") ?? "").trim();
    const c2 = String(formData.get("sys_choice2") ?? "").trim();
    if (!c1 || !UUID_RE.test(c1) || !(await divisionBelongsToEvent(c1))) redirect(`${back}?error=submit`);
    choice1 = c1;
    if (c2) {
      if (!UUID_RE.test(c2) || c2 === c1 || !(await divisionBelongsToEvent(c2))) redirect(`${back}?error=submit`);
      choice2 = c2;
    }
  }

  // Pertanyaan kustom — bentuk penyimpanan mengikuti konvensi membership:
  // grid = objek {rowIndex: value|string[]}, multiselect = array, checkbox boolean.
  const fields = await db
    .select()
    .from(formFields)
    .where(eq(formFields.formId, form.id))
    .orderBy(asc(formFields.orderIndex));
  const responses: Record<string, unknown> = {};

  for (const f of fields) {
    if (f.type === "section") continue;

    if (GRID_TYPES.includes(f.type)) {
      const rows = (f.config as { rows?: string[] } | null)?.rows ?? [];
      const map: Record<string, string | string[]> = {};
      let missing = false;
      for (let i = 0; i < rows.length; i++) {
        const entries = formData
          .getAll(`${f.key}::${i}`)
          .map((entry) => scrubForeignPrivateUrl(String(entry), "form-file", userId))
          .filter(Boolean);
        if (entries.length === 0) {
          missing = true;
          continue;
        }
        map[String(i)] = f.type === "grid_checkbox" ? entries : entries[0];
      }
      // Grid tanpa baris terkonfigurasi dianggap belum diatur — bukan wajib.
      if (f.required && rows.length > 0 && missing) redirect(`${back}?error=submit`);
      if (Object.keys(map).length > 0) responses[f.key] = map;
      continue;
    }

    if (f.type === "multiselect") {
      const vals = formData
        .getAll(f.key)
        .map((entry) => scrubForeignPrivateUrl(String(entry), "form-file", userId))
        .filter(Boolean);
      if (f.required && vals.length === 0) redirect(`${back}?error=submit`);
      if (vals.length > 0) responses[f.key] = vals;
      continue;
    }

    if (f.type === "checkbox") {
      const checked = formData.get(f.key) === "true";
      if (f.required && !checked) redirect(`${back}?error=submit`);
      responses[f.key] = checked;
      continue;
    }

    if (f.type === "file" || f.type === "image") {
      const raw = String(formData.get(f.key) ?? "").trim();
      const safe = scrubForeignPrivateUrl(raw, "form-file", userId);
      if (f.required && !safe) redirect(`${back}?error=submit`);
      if (safe) responses[f.key] = safe;
      continue;
    }

    const raw = String(formData.get(f.key) ?? "").trim();
    // Semua jawaban teks ikut disaring: URL berkas privat milik orang lain yang
    // ditempel ke pertanyaan bebas tidak boleh tersimpan (kalau tersimpan,
    // pemilik baris jadi "berhak" membacanya lewat jalur pemilik).
    const safe = scrubForeignPrivateUrl(raw, "form-file", userId);
    if (f.required && !safe) redirect(`${back}?error=submit`);
    const validations = (f.config as { validations?: { min?: number; max?: number; minLength?: number } } | null)
      ?.validations;
    if (validations && safe) {
      if (f.type === "number") {
        const num = Number(safe);
        if (!Number.isFinite(num)) redirect(`${back}?error=submit`);
        if ((validations.min != null && num < validations.min) || (validations.max != null && num > validations.max)) {
          redirect(`${back}?error=submit`);
        }
      } else if (typeof validations.minLength === "number" && safe.length < validations.minLength) {
        redirect(`${back}?error=submit`);
      }
    }
    if (safe) responses[f.key] = safe;
  }

  await db
    .insert(formApplications)
    .values({
      formId: form.id,
      userId,
      fullName: membership.displayName || session?.user?.name || "",
      cabinetDivision: membership.divisionName ?? "-",
      positionApplied,
      choice1DivisionId: choice1,
      choice2DivisionId: choice2,
      responses,
    })
    .onConflictDoNothing();

  revalidatePath(`/console/forms/${form.id}`);
  revalidatePath(FORM_TAB_PATH[form.kind]);
  redirect(`${back}/submitted`);
}

// ---- Penempatan & keputusan (halaman detail pelamar) ----

const APPLICATION_STATUSES = [
  "pending",
  "accepted",
  "accepted_choice1",
  "accepted_choice2",
  "reassigned",
  "rejected",
] as const;
type AppStatus = (typeof APPLICATION_STATUSES)[number];

const ACCEPTED_STATUSES: AppStatus[] = ["accepted", "accepted_choice1", "accepted_choice2", "reassigned"];

function statusAllowed(kind: FormKind, status: AppStatus): boolean {
  if (kind === "oprek_kepanitiaan") return true;
  return status === "pending" || status === "accepted" || status === "rejected";
}

function roleLabelFor(kind: FormKind, role: string | null): string {
  if (!role) return "";
  if (kind === "oprek_bph_acara") return BPH_FORM_ROLE_LABEL[role] ?? role;
  return EVENT_COMMITTEE_ROLE_LABEL[role as EventCommitteeRole] ?? role;
}

// Kirim keputusan ke pelamar: in-app (kalau punya akun — selalu, karena form ini
// kabinet) + email. Kegagalan tidak boleh membatalkan simpanan pengurus; hasilnya
// dicatat di audit log (pola yang sama dengan keputusan membership).
async function notifyFormApplicant(input: {
  applicationId: string;
  userId: string;
  formTitle: string;
  key: NotificationTemplateKey;
  variables: Record<string, string>;
}): Promise<string> {
  try {
    const [applicant] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, input.userId));
    if (!applicant) return "skipped";

    const def = getTemplateDef(input.key);
    if (!def) return "skipped";
    const [row] = await db
      .select()
      .from(notificationTemplates)
      .where(eq(notificationTemplates.key, input.key))
      .limit(1);
    const subject = renderTemplate(row?.subject?.trim() || def.defaultSubject, input.variables);
    const body = renderTemplate(row?.bodyTemplate?.trim() || def.defaultBody, input.variables);

    await createTemplatedNotification({
      userId: input.userId,
      templateKey: input.key,
      variables: input.variables,
      relatedEntityType: "form_application",
      relatedEntityId: input.applicationId,
    });

    const result = await sendEmail({
      to: applicant.email,
      subject,
      html: renderMembershipEmail({ heading: subject, body }),
      text: renderMembershipEmailText({ heading: subject, body }),
    });
    return result.ok ? "sent" : `failed: ${result.reason ?? "unknown"}`;
  } catch (err) {
    console.error("[forms] failed to announce placement:", err);
    return `failed: ${err instanceof Error ? err.message : "unknown error"}`;
  }
}

// Keputusan/penempatan satu pelamar. Semua validasi diulang di server; saat
// penempatan menyentuh event_committee, kunci acara (14 hari) dihormati lewat
// canPlaceApplicant — hanya BPH Kabinet/Divisi Teknologi yang bisa menembusnya.
export async function updateApplicationPlacement(formData: FormData) {
  const formId = String(formData.get("formId") ?? "");
  const applicationId = String(formData.get("applicationId") ?? "");
  const { form, access } = await requireFormManage(formId);
  if (!UUID_RE.test(applicationId)) notFound();

  const [app] = await db
    .select()
    .from(formApplications)
    .where(and(eq(formApplications.id, applicationId), eq(formApplications.formId, form.id)));
  if (!app) notFound();

  const statusRaw = String(formData.get("status") ?? "pending");
  if (!APPLICATION_STATUSES.includes(statusRaw as AppStatus)) throw new Error("Status tidak valid.");
  const status = statusRaw as AppStatus;
  if (!statusAllowed(form.kind, status)) throw new Error("Status tidak berlaku untuk formulir ini.");

  const notifyApplicant = formData.get("notifyApplicant") !== null;
  const note = String(formData.get("note") ?? "").trim();

  // Role penempatan per jenis form.
  let role: string | null = null;
  if (form.kind === "oprek_bph_acara") {
    const inputRole = String(formData.get("assignedRole") ?? "").trim();
    const fallback = app.positionApplied ?? (form.bphRoles as string[])[0] ?? null;
    role = (BPH_FORM_ROLES as string[]).includes(inputRole) ? inputRole : fallback;
  } else if (form.kind === "oprek_kepanitiaan") {
    const inputRole = String(formData.get("assignedRole") ?? "").trim();
    role = (PLACEMENT_ROLE_OPTIONS as string[]).includes(inputRole) ? inputRole : "anggota";
  }

  // Divisi penempatan (kepanitiaan). accepted/pending/rejected tanpa divisi.
  let assignedDivisionId: string | null = null;
  if (form.kind === "oprek_kepanitiaan" && ACCEPTED_STATUSES.includes(status)) {
    if (status === "accepted_choice1") {
      assignedDivisionId = app.choice1DivisionId;
    } else if (status === "accepted_choice2") {
      assignedDivisionId = app.choice2DivisionId;
    } else if (status === "reassigned") {
      const picked = String(formData.get("assignedDivisionId") ?? "").trim();
      if (picked && form.eventId) {
        const rows = await db
          .select({ id: eventDivisions.id })
          .from(eventDivisions)
          .where(and(eq(eventDivisions.id, picked), eq(eventDivisions.eventId, form.eventId)));
        if (rows.length === 0) throw new Error("Divisi itu tidak ada di acara ini.");
        assignedDivisionId = picked;
      }
      if (!assignedDivisionId) throw new Error("Pilih divisi penempatan dulu.");
    } else {
      assignedDivisionId = app.choice1DivisionId;
    }
  }

  // Perubahan yang menyentuh event_committee butuh izin penempatan (acara tidak terkunci).
  const touchingCommittee = form.kind !== "pemilu";
  const willAssign = touchingCommittee && ACCEPTED_STATUSES.includes(status);
  const willRemove =
    touchingCommittee && !ACCEPTED_STATUSES.includes(status) && ACCEPTED_STATUSES.includes(app.status as AppStatus);
  if (willAssign || willRemove) {
    if (!(await canPlaceApplicant(form.eventId, access))) {
      throw new Error("Acara ini terkunci atau kamu tidak berhak mengubah penugasan.");
    }
  }

  const before = { status: app.status, role: app.assignedRole, divisionId: app.assignedDivisionId };

  await db
    .update(formApplications)
    .set({
      status,
      assignedRole: form.kind === "pemilu" ? null : (role as EventCommitteeRole | null),
      assignedDivisionId,
      note: note || null,
      reviewedAt: new Date(),
    })
    .where(eq(formApplications.id, app.id));

  // Sinkronisasi penugasan kepanitiaan: satu baris per (acara, user).
  if (touchingCommittee && form.eventId) {
    const [existing] = await db
      .select({ id: eventCommittee.id, role: eventCommittee.role })
      .from(eventCommittee)
      .where(and(eq(eventCommittee.eventId, form.eventId), eq(eventCommittee.userId, app.userId)));

    if (willAssign) {
      if (existing) {
        // Jangan turunkan BPH Acara jadi anggota hanya karena diterima di
        // form kepanitiaan — role BPH yang menang, divisinya tetap diperbarui.
        const keepBph = form.kind === "oprek_kepanitiaan" && isBphPanitiaRole(existing.role);
        await db
          .update(eventCommittee)
          .set({
            role: (keepBph ? existing.role : ((role ?? "anggota") as EventCommitteeRole)),
            divisionId: assignedDivisionId,
          })
          .where(eq(eventCommittee.id, existing.id));
      } else {
        await db
          .insert(eventCommittee)
          .values({
            eventId: form.eventId,
            userId: app.userId,
            role: (role ?? "anggota") as EventCommitteeRole,
            divisionId: assignedDivisionId,
            note: `Oprek: ${form.title}`,
          })
          .onConflictDoNothing();
      }
    } else if (willRemove) {
      // Hapus baris panitia hanya kalau tidak ada penerimaan lain di acara yang sama.
      const others = await db
        .select({ id: formApplications.id })
        .from(formApplications)
        .innerJoin(forms, eq(forms.id, formApplications.formId))
        .where(
          and(
            eq(formApplications.userId, app.userId),
            eq(forms.eventId, form.eventId),
            ne(formApplications.id, app.id),
            inArray(formApplications.status, ["accepted", "accepted_choice1", "accepted_choice2", "reassigned"]),
          ),
        );
      if (others.length === 0) {
        await db
          .delete(eventCommittee)
          .where(and(eq(eventCommittee.eventId, form.eventId), eq(eventCommittee.userId, app.userId)));
      }
    }
  }

  // Notifikasi hanya saat ada perubahan nyata (simpan ulang tidak mengirim lagi).
  const changed =
    before.status !== status || before.role !== (role ?? null) || before.divisionId !== assignedDivisionId;
  let decisionEmail: string | null = null;
  if (changed && notifyApplicant) {
    let key: NotificationTemplateKey | null = null;
    if (ACCEPTED_STATUSES.includes(status)) key = "oprek_accepted";
    else if (status === "rejected") key = "oprek_rejected";
    else if (ACCEPTED_STATUSES.includes(before.status as AppStatus)) key = "oprek_placement_changed";

    if (key) {
      const [eventRow] = form.eventId
        ? await db.select({ title: events.title }).from(events).where(eq(events.id, form.eventId))
        : [];
      let divisionName: string | null = null;
      if (assignedDivisionId) {
        const [div] = await db
          .select({ name: eventDivisions.name })
          .from(eventDivisions)
          .where(eq(eventDivisions.id, assignedDivisionId));
        divisionName = div?.name ?? null;
      }
      const roleLabel = roleLabelFor(form.kind, role);
      let details = "";
      if (ACCEPTED_STATUSES.includes(status)) {
        if (form.kind === "oprek_bph_acara") {
          details = `Kamu tercatat sebagai ${roleLabel} (BPH Acara)${eventRow?.title ? ` untuk acara "${eventRow.title}"` : ""}.`;
        } else if (form.kind === "oprek_kepanitiaan") {
          details = `Kamu ditempatkan di ${divisionName ?? "divisi terpilih"} sebagai ${roleLabel}.`;
        } else {
          details = "Kamu tercatat sebagai calon pada periode berikutnya.";
        }
      } else if (status === "rejected") {
        details = "";
      } else {
        details = divisionName
          ? `Penempatanmu sekarang: ${roleLabel ? `${roleLabel} — ` : ""}${divisionName}.`
          : `Role kamu sekarang: ${roleLabel}.`;
      }
      decisionEmail = await notifyFormApplicant({
        applicationId: app.id,
        userId: app.userId,
        formTitle: form.title,
        key,
        variables: { fullName: app.fullName, formTitle: form.title, details },
      });
    } else {
      decisionEmail = "skipped";
    }
  }

  await db.insert(auditLogs).values({
    actorUserId: access.userId,
    entityType: "form_application",
    entityId: app.id,
    action: ACCEPTED_STATUSES.includes(status) ? `decision_${status}` : status === "rejected" ? "decision_rejected" : "status_changed",
    beforeJson: before,
    afterJson: { status, role, divisionId: assignedDivisionId, decisionEmail },
  });

  revalidatePath(`/console/forms/${form.id}`);
  revalidatePath(`/console/forms/${form.id}/applicants/${app.id}`);
  revalidatePath(FORM_TAB_PATH[form.kind]);
}

// Simpan catatan internal saja (tanpa menyentuh status/penempatan) — dipisah
// supaya mengetik catatan tidak diam-diam mengembalikan status yang baru diubah
// pengurus lain (pola yang sama dengan lamaran lowongan).
export async function updateApplicationNote(formData: FormData) {
  const formId = String(formData.get("formId") ?? "");
  const applicationId = String(formData.get("applicationId") ?? "");
  const { form } = await requireFormManage(formId);
  if (!UUID_RE.test(applicationId)) notFound();
  const note = String(formData.get("note") ?? "").trim();
  await db
    .update(formApplications)
    .set({ note: note || null })
    .where(and(eq(formApplications.id, applicationId), eq(formApplications.formId, form.id)));
  revalidatePath(`/console/forms/${form.id}/applicants/${applicationId}`);
}
