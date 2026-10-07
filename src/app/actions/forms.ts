"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import {
  formFieldTypeEnum,
  formSubmissions,
  formTemplates,
  formTemplateStatusEnum,
  type FormAnswers,
  type FormField,
  type FormSection,
} from "@/db/schema";
import { requireModuleAccess } from "@/lib/admin-scope";
import { FORM_TEMPLATE_DEFAULTS, formPublicPath } from "@/lib/form-templates";
import { sendEmail } from "@/lib/email";

export type FormSubmitState = {
  ok?: boolean;
  already?: boolean;
  error?: "required" | "invalid" | "closed" | "generic";
  // id field yang jawaban wajibnya kosong, untuk penanda merah di klien.
  missing?: string[];
};

export type FormTemplateEditState = {
  ok?: boolean;
  error?: string;
};

const TOKEN_MIN = 8;
const TOKEN_MAX = 100;
const SHORT_MAX = 500;
const PARAGRAPH_MAX = 2000;
const EMAIL_MAX = 200;
const TEL_MAX = 40;
const DATE_MAX = 10;
const URL_MAX = 600;
const OPTION_MAX = 200;
const OPTIONS_MAX = 50;
const NOTE_MAX = 2000;

function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current; depth += 1) {
    if (
      typeof current === "object" &&
      current !== null &&
      "code" in current &&
      (current as { code?: unknown }).code === "23505"
    ) {
      return true;
    }
    current =
      typeof current === "object" && current !== null && "cause" in current
        ? (current as { cause?: unknown }).cause
        : null;
  }
  return false;
}

const FIELD_ID_RE = /^[a-z0-9][a-z0-9-]{0,60}$/;

function clampString(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function normalizeSections(value: unknown): FormSection[] | null {
  if (!Array.isArray(value)) return null;
  const sections: FormSection[] = [];
  const fieldIds = new Set<string>();
  for (const rawSection of value) {
    if (typeof rawSection !== "object" || rawSection === null) return null;
    const s = rawSection as Record<string, unknown>;
    const title = clampString(s.title, 120);
    if (!title) return null;
    const description = clampString(s.description, 500) ?? undefined;
    if (!Array.isArray(s.fields)) return null;
    const fields: FormField[] = [];
    for (const rawField of s.fields) {
      if (typeof rawField !== "object" || rawField === null) return null;
      const f = rawField as Record<string, unknown>;
      const id = typeof f.id === "string" ? f.id.trim() : "";
      if (!FIELD_ID_RE.test(id) || fieldIds.has(id)) return null;
      fieldIds.add(id);
      const type = formFieldTypeEnum.enumValues.find((t) => t === f.type);
      if (!type) return null;
      const label = clampString(f.label, 200);
      if (!label) return null;
      const isChoice = type === "select" || type === "radio" || type === "multiselect";
      let options: string[] | undefined;
      if (isChoice) {
        const parsed = Array.isArray(f.options)
          ? f.options
              .map((o) => (typeof o === "string" ? o.trim().slice(0, OPTION_MAX) : ""))
              .filter((o): o is string => Boolean(o))
              .slice(0, OPTIONS_MAX)
          : [];
        if (parsed.length < 1) return null;
        options = parsed;
      }
      const scaleMax =
        type === "scale"
          ? typeof f.scaleMax === "number" && Number.isInteger(f.scaleMax) && f.scaleMax >= 2 && f.scaleMax <= 10
            ? f.scaleMax
            : null
          : undefined;
      if (type === "scale" && !scaleMax) return null;
      fields.push({
        id,
        type,
        label,
        description: clampString(f.description, 500) ?? undefined,
        placeholder: clampString(f.placeholder, 200) ?? undefined,
        required: f.required === true,
        options,
        scaleMax: scaleMax ?? undefined,
        lowLabel: clampString(f.lowLabel, 40) ?? undefined,
        highLabel: clampString(f.highLabel, 40) ?? undefined,
      });
    }
    sections.push({ id: sections.length + "", title, description, fields });
  }
  return sections;
}

const BLOB_URL_RE = /^https:\/\/[^/]*public\.blob\.vercel-storage\.com\//;
const PROXY_PATH_RE = /^\/[\w\-./%]+$/;

// Validasi & normalisasi jawaban sesuai definisi field. Mengembalikan null
// berarti jawaban invalid (bukan sekadar kosong).
function parseAnswer(field: FormField, raw: FormDataEntryValue | null, all: FormDataEntryValue[]):
  | { kind: "empty" }
  | { kind: "invalid" }
  | { kind: "value"; value: string | number | string[] } {
  const first = typeof raw === "string" ? raw.trim() : "";
  switch (field.type) {
    case "short_text":
      if (!first) return { kind: "empty" };
      return first.length <= SHORT_MAX ? { kind: "value", value: first } : { kind: "invalid" };
    case "paragraph":
      if (!first) return { kind: "empty" };
      return first.length <= PARAGRAPH_MAX ? { kind: "value", value: first } : { kind: "invalid" };
    case "email":
      if (!first) return { kind: "empty" };
      return first.length <= EMAIL_MAX && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(first)
        ? { kind: "value", value: first }
        : { kind: "invalid" };
    case "tel":
      if (!first) return { kind: "empty" };
      return first.length <= TEL_MAX ? { kind: "value", value: first } : { kind: "invalid" };
    case "number": {
      if (!first) return { kind: "empty" };
      const num = Number(first);
      return Number.isFinite(num) && first.length <= 40 ? { kind: "value", value: num } : { kind: "invalid" };
    }
    case "date":
      if (!first) return { kind: "empty" };
      return /^\d{4}-\d{2}-\d{2}$/.test(first) && first.length <= DATE_MAX
        ? { kind: "value", value: first }
        : { kind: "invalid" };
    case "select":
    case "radio":
      if (!first) return { kind: "empty" };
      return (field.options ?? []).includes(first) ? { kind: "value", value: first } : { kind: "invalid" };
    case "multiselect": {
      const values = all
        .map((v) => (typeof v === "string" ? v.trim() : ""))
        .filter((v) => v.length > 0);
      if (values.length === 0) return { kind: "empty" };
      if (values.length > OPTIONS_MAX) return { kind: "invalid" };
      return values.every((v) => (field.options ?? []).includes(v))
        ? { kind: "value", value: values }
        : { kind: "invalid" };
    }
    case "scale": {
      if (!first) return { kind: "empty" };
      const num = Number.parseInt(first, 10);
      const max = field.scaleMax ?? 5;
      return Number.isInteger(num) && num >= 1 && num <= max ? { kind: "value", value: num } : { kind: "invalid" };
    }
    case "file":
      if (!first) return { kind: "empty" };
      return first.length <= URL_MAX && (BLOB_URL_RE.test(first) || PROXY_PATH_RE.test(first))
        ? { kind: "value", value: first }
        : { kind: "invalid" };
  }
}

function collectAnswers(sections: FormSection[], formData: FormData):
  | { kind: "invalid"; missing: string[] }
  | { kind: "ok"; answers: FormAnswers } {
  const answers: FormAnswers = {};
  const missing: string[] = [];
  for (const section of sections) {
    for (const fieldDef of section.fields) {
      const raw = formData.get(fieldDef.id);
      const all = formData.getAll(fieldDef.id);
      const parsed = parseAnswer(fieldDef, raw, all);
      if (parsed.kind === "invalid") return { kind: "invalid", missing };
      if (parsed.kind === "empty") {
        if (fieldDef.required) missing.push(fieldDef.id);
        continue;
      }
      answers[fieldDef.id] = parsed.value;
    }
  }
  if (missing.length > 0) return { kind: "invalid", missing };
  return { kind: "ok", answers };
}

export async function submitFormTemplate(
  _prev: FormSubmitState,
  formData: FormData,
): Promise<FormSubmitState> {
  const slug = typeof formData.get("slug") === "string" ? String(formData.get("slug")).trim() : "";
  if (!slug) return { error: "invalid" };

  const [template] = await db.select().from(formTemplates).where(eq(formTemplates.slug, slug));
  if (!template) return { error: "invalid" };
  if (template.status !== "published") return { error: "closed" };

  const token = typeof formData.get("token") === "string" ? String(formData.get("token")).trim() : "";
  if (token.length < TOKEN_MIN || token.length > TOKEN_MAX) return { error: "invalid" };

  const collected = collectAnswers(template.sections, formData);
  if (collected.kind === "invalid") {
    return collected.missing.length > 0
      ? { error: "required", missing: collected.missing }
      : { error: "invalid" };
  }

  const session = await auth();
  const submitterUserId = session?.user?.id ?? null;

  try {
    await db.insert(formSubmissions).values({
      templateId: template.id,
      answers: collected.answers,
      responderToken: token,
      submitterUserId,
    });
  } catch (error) {
    if (isUniqueViolation(error)) return { already: true };
    console.error("[forms] insert submission failed:", error);
    return { error: "generic" };
  }

  if (template.notifyEmail) {
    const firstText = Object.entries(collected.answers)
      .filter(([, v]) => typeof v === "string" && v.length > 0)
      .slice(0, 3)
      .map(([k, v]) => `${k}: ${String(v).slice(0, 120)}`)
      .join("\n");
    await sendEmail({
      to: template.notifyEmail,
      subject: `Jawaban baru — ${template.title}`,
      text: `Ada jawaban baru untuk ${template.title}.\n\n${firstText}\n\nLihat semua di /console/forms.`,
      html: `<p>Ada jawaban baru untuk <strong>${template.title}</strong>.</p><pre>${firstText}</pre><p>Lihat semua di <a href="/console/forms">console</a>.</p>`,
    });
  }

  revalidatePath(`/console/forms/${template.id}`);
  const publicPath = formPublicPath(template.slug);
  if (publicPath) revalidatePath(publicPath);
  return { ok: true };
}

export async function createMissingFormTemplates(): Promise<void> {
  await requireModuleAccess("forms");
  const existing = await db.select({ slug: formTemplates.slug }).from(formTemplates);
  const existingSlugs = new Set(existing.map((row) => row.slug));
  const missing = FORM_TEMPLATE_DEFAULTS.filter((d) => !existingSlugs.has(d.slug));
  if (missing.length === 0) return;
  await db.insert(formTemplates).values(
    missing.map((d) => ({
      slug: d.slug,
      title: d.title,
      description: d.description,
      status: "draft" as const,
      sections: d.sections,
    })),
  );
  revalidatePath("/console/forms");
}

export async function updateFormTemplate(
  _prev: FormTemplateEditState,
  formData: FormData,
): Promise<FormTemplateEditState> {
  await requireModuleAccess("forms");

  const id = typeof formData.get("id") === "string" ? String(formData.get("id")).trim() : "";
  if (!id) return { error: "Template tidak ditemukan." };

  const title = typeof formData.get("title") === "string" ? String(formData.get("title")).trim() : "";
  if (!title || title.length > 200) return { error: "Judul wajib diisi (maks. 200 karakter)." };

  const description = clampString(formData.get("description"), 1000) ?? null;
  const successMessage = clampString(formData.get("successMessage"), 1000) ?? null;
  const notifyEmailRaw = clampString(formData.get("notifyEmail"), EMAIL_MAX) ?? null;
  if (notifyEmailRaw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notifyEmailRaw)) {
    return { error: "Email notifikasi tidak valid." };
  }
  const statusRaw = typeof formData.get("status") === "string" ? String(formData.get("status")).trim() : "";
  const status = formTemplateStatusEnum.enumValues.find((s) => s === statusRaw);
  if (!status) return { error: "Status tidak valid." };

  let sectionsJson: unknown;
  try {
    sectionsJson = JSON.parse(String(formData.get("sections") ?? ""));
  } catch {
    return { error: "Struktur pertanyaan tidak valid." };
  }
  const sections = normalizeSections(sectionsJson);
  if (!sections) return { error: "Struktur pertanyaan tidak valid — periksa label, id, dan opsi." };

  const [updated] = await db
    .update(formTemplates)
    .set({
      title,
      description,
      status,
      sections,
      successMessage,
      notifyEmail: notifyEmailRaw,
      updatedAt: new Date(),
    })
    .where(eq(formTemplates.id, id))
    .returning({ slug: formTemplates.slug });
  if (!updated) return { error: "Template tidak ditemukan." };

  revalidatePath("/console/forms");
  revalidatePath(`/console/forms/${id}`);
  const publicPath = formPublicPath(updated.slug);
  if (publicPath) revalidatePath(publicPath);
  return { ok: true };
}

export async function duplicateFormTemplate(
  _prev: FormTemplateEditState,
  formData: FormData,
): Promise<FormTemplateEditState> {
  await requireModuleAccess("forms");

  const sourceId = typeof formData.get("sourceId") === "string" ? String(formData.get("sourceId")).trim() : "";
  const slugRaw = typeof formData.get("slug") === "string" ? String(formData.get("slug")).trim() : "";
  const title = typeof formData.get("title") === "string" ? String(formData.get("title")).trim() : "";
  const slug = slugRaw.toLowerCase();

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 60) {
    return { error: "Slug hanya boleh huruf kecil, angka, dan tanda hubung." };
  }
  if (!title || title.length > 200) return { error: "Judul wajib diisi (maks. 200 karakter)." };

  const [source] = await db.select().from(formTemplates).where(eq(formTemplates.id, sourceId));
  if (!source) return { error: "Template sumber tidak ditemukan." };

  try {
    await db.insert(formTemplates).values({
      slug,
      title,
      description: source.description,
      status: "draft",
      sections: source.sections,
      successMessage: source.successMessage,
      notifyEmail: source.notifyEmail,
    });
  } catch (error) {
    if (isUniqueViolation(error)) return { error: "Slug sudah dipakai template lain." };
    throw error;
  }

  revalidatePath("/console/forms");
  return { ok: true };
}

export async function deleteFormTemplate(formData: FormData): Promise<void> {
  await requireModuleAccess("forms");
  const id = typeof formData.get("id") === "string" ? String(formData.get("id")).trim() : "";
  if (!id) return;
  const [deleted] = await db.delete(formTemplates).where(eq(formTemplates.id, id)).returning({ slug: formTemplates.slug });
  if (!deleted) return;
  revalidatePath("/console/forms");
  const publicPath = formPublicPath(deleted.slug);
  if (publicPath) revalidatePath(publicPath);
}

export async function setFormTemplateStatus(formData: FormData): Promise<void> {
  await requireModuleAccess("forms");
  const id = typeof formData.get("id") === "string" ? String(formData.get("id")).trim() : "";
  const statusRaw = typeof formData.get("status") === "string" ? String(formData.get("status")).trim() : "";
  const status = formTemplateStatusEnum.enumValues.find((s) => s === statusRaw);
  if (!id || !status) return;
  const [updated] = await db
    .update(formTemplates)
    .set({ status, updatedAt: new Date() })
    .where(eq(formTemplates.id, id))
    .returning({ slug: formTemplates.slug });
  if (!updated) return;
  revalidatePath("/console/forms");
  revalidatePath(`/console/forms/${id}`);
  const publicPath = formPublicPath(updated.slug);
  if (publicPath) revalidatePath(publicPath);
}

async function loadSubmissionWithTemplate(submissionId: string) {
  const [row] = await db
    .select({ id: formSubmissions.id, templateId: formSubmissions.templateId })
    .from(formSubmissions)
    .where(eq(formSubmissions.id, submissionId));
  return row ?? null;
}

export async function setSubmissionReviewed(formData: FormData): Promise<void> {
  await requireModuleAccess("forms");
  const id = typeof formData.get("id") === "string" ? String(formData.get("id")).trim() : "";
  const reviewed = formData.get("reviewed") === "true";
  if (!id) return;
  const submission = await loadSubmissionWithTemplate(id);
  if (!submission) return;
  const session = await auth();
  await db
    .update(formSubmissions)
    .set({
      reviewed,
      reviewedBy: reviewed ? (session?.user?.id ?? null) : null,
      reviewedAt: reviewed ? new Date() : null,
    })
    .where(eq(formSubmissions.id, id));
  revalidatePath(`/console/forms/${submission.templateId}`);
}

export async function saveSubmissionNote(
  _prev: FormTemplateEditState,
  formData: FormData,
): Promise<FormTemplateEditState> {
  await requireModuleAccess("forms");
  const id = typeof formData.get("id") === "string" ? String(formData.get("id")).trim() : "";
  if (!id) return { error: "Jawaban tidak ditemukan." };
  const note = clampString(formData.get("internalNote"), NOTE_MAX) ?? null;
  const submission = await loadSubmissionWithTemplate(id);
  if (!submission) return { error: "Jawaban tidak ditemukan." };
  await db.update(formSubmissions).set({ internalNote: note }).where(eq(formSubmissions.id, id));
  revalidatePath(`/console/forms/${submission.templateId}`);
  return { ok: true };
}

export async function deleteFormSubmission(formData: FormData): Promise<void> {
  await requireModuleAccess("forms");
  const id = typeof formData.get("id") === "string" ? String(formData.get("id")).trim() : "";
  if (!id) return;
  const submission = await loadSubmissionWithTemplate(id);
  if (!submission) return;
  await db.delete(formSubmissions).where(eq(formSubmissions.id, id));
  revalidatePath(`/console/forms/${submission.templateId}`);
}

