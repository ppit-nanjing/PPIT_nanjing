"use server";

import { asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { events, formFields, forms } from "@/db/schema";
import { parseChinaLocalInput } from "@/lib/datetime";
import { getFormsAccess, requireFormManage } from "@/lib/form-access";
import { BPH_FORM_ROLES, FORM_TAB_PATH, type FormKind } from "@/lib/form-types";
import { FIELD_TYPE_LABELS, QUESTION_BY_KEY, type MembershipFieldDef } from "@/lib/membership-form";
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
