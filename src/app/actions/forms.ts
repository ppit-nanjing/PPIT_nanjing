"use server";

import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { eventDivisions, events, formApplications, formFields, forms } from "@/db/schema";
import { parseChinaLocalInput } from "@/lib/datetime";
import { getCabinetMembership, getFormsAccess, requireFormManage } from "@/lib/form-access";
import { BPH_FORM_ROLES, FORM_TAB_PATH, type FormKind } from "@/lib/form-types";
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
      let missing = rows.length === 0;
      for (let i = 0; i < rows.length; i++) {
        const entries = formData.getAll(`${f.key}::${i}`).map(String).filter(Boolean);
        if (entries.length === 0) {
          missing = true;
          continue;
        }
        map[String(i)] = f.type === "grid_checkbox" ? entries : entries[0];
      }
      if (f.required && missing) redirect(`${back}?error=submit`);
      if (Object.keys(map).length > 0) responses[f.key] = map;
      continue;
    }

    if (f.type === "multiselect") {
      const vals = formData.getAll(f.key).map(String).filter(Boolean);
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
    if (f.required && !raw) redirect(`${back}?error=submit`);
    const validations = (f.config as { validations?: { min?: number; max?: number; minLength?: number } } | null)
      ?.validations;
    if (validations && raw) {
      if (f.type === "number") {
        const num = Number(raw);
        if ((validations.min != null && num < validations.min) || (validations.max != null && num > validations.max)) {
          redirect(`${back}?error=submit`);
        }
      } else if (typeof validations.minLength === "number" && raw.length < validations.minLength) {
        redirect(`${back}?error=submit`);
      }
    }
    if (raw) responses[f.key] = raw;
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
