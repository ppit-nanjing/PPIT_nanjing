"use server";

import { asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { membershipApplications, membershipFormFields, recruitmentPeriods } from "@/db/schema";
import { requireModuleAccess } from "@/lib/admin-scope";
import { CORE_KEYS, DEFAULT_FIELDS, type MembershipFieldDef } from "@/lib/membership-form";

export async function getFormFields(): Promise<MembershipFieldDef[]> {
  const rows = await db
    .select()
    .from(membershipFormFields)
    .orderBy(asc(membershipFormFields.orderIndex));
  if (rows.length === 0) return DEFAULT_FIELDS;
  return rows.map((r) => ({
    id: r.id,
    key: r.key,
    label: r.label,
    type: r.type,
    placeholder: r.placeholder ?? undefined,
    helpText: r.helpText ?? undefined,
    required: r.required,
    options: r.options ? r.options.split("\n").map((s) => s.trim()).filter(Boolean) : undefined,
    isCore: r.isCore,
  }));
}

export async function submitMembershipApplication(recruitmentPeriodId: string, formData: FormData) {
  const [period] = await db.select().from(recruitmentPeriods).where(eq(recruitmentPeriods.id, recruitmentPeriodId));
  if (!period?.isOpen) throw new Error("Pendaftaran sedang tidak dibuka");

  const session = await auth();
  const fields = await getFormFields();

  const responses: Record<string, string> = {};
  for (const f of fields) {
    responses[f.key] = String(formData.get(f.key) ?? "").trim();
  }

  const fullName = responses[CORE_KEYS.fullName];
  const email = responses[CORE_KEYS.email];
  if (!fullName || !email) throw new Error("Nama dan email wajib diisi");

  for (const f of fields) {
    if (!f.required) continue;
    const v = responses[f.key];
    const empty = f.type === "checkbox" ? v !== "true" : !v;
    if (empty) throw new Error(`Field "${f.label}" wajib diisi`);
  }

  await db.insert(membershipApplications).values({
    recruitmentPeriodId,
    userId: session?.user?.id ?? null,
    fullName,
    email,
    whatsapp: responses[CORE_KEYS.whatsapp] || null,
    university: responses[CORE_KEYS.university] || null,
    major: responses[CORE_KEYS.major] || null,
    expectedGraduation: responses[CORE_KEYS.expectedGraduation] || null,
    divisionInterest: responses[CORE_KEYS.divisionInterest] || null,
    motivation: responses[CORE_KEYS.motivation] || null,
    commitment: responses[CORE_KEYS.commitment] || null,
    responses,
  });

  redirect("/join-us/success");
}

const STATUS_VALUES = ["pending", "reviewed", "accepted", "rejected"] as const;

export async function updateMembershipStatus(formData: FormData) {
  await requireModuleAccess("membership");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!STATUS_VALUES.includes(status as (typeof STATUS_VALUES)[number])) throw new Error("Status tidak valid");
  await db.update(membershipApplications).set({ status: status as (typeof STATUS_VALUES)[number], reviewedAt: new Date() }).where(eq(membershipApplications.id, id));
  revalidatePath("/console/membership");
  revalidatePath(`/console/membership/${id}`);
}

export async function updateMembershipNote(formData: FormData) {
  await requireModuleAccess("membership");
  const id = String(formData.get("id") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  await db.update(membershipApplications).set({ note: note || null }).where(eq(membershipApplications.id, id));
  revalidatePath(`/console/membership/${id}`);
}

export async function deleteMembershipApplication(formData: FormData) {
  await requireModuleAccess("membership");
  const id = String(formData.get("id") ?? "");
  await db.delete(membershipApplications).where(eq(membershipApplications.id, id));
  revalidatePath("/console/membership");
  redirect("/console/membership");
}

// ---- Form builder (admin) ----

export async function initFormFields() {
  await requireModuleAccess("membership");
  const [existing] = await db.select({ id: membershipFormFields.id }).from(membershipFormFields).limit(1);
  if (existing) return;
  await db.insert(membershipFormFields).values(
    DEFAULT_FIELDS.map((f, i) => ({
      key: f.key,
      label: f.label,
      type: f.type,
      placeholder: f.placeholder ?? null,
      helpText: f.helpText ?? null,
      required: f.required,
      options: null,
      orderIndex: i,
      isCore: f.isCore,
    }))
  );
  revalidatePath("/console/membership/form");
}

export async function createFormField(formData: FormData) {
  await requireModuleAccess("membership");
  const label = String(formData.get("label") ?? "").trim() || "Field baru";
  const type = String(formData.get("type") ?? "text");
  const maxRow = await db.select({ o: membershipFormFields.orderIndex }).from(membershipFormFields).orderBy(asc(membershipFormFields.orderIndex));
  const nextOrder = maxRow.length ? Math.max(...maxRow.map((r) => r.o)) + 1 : 0;
  await db.insert(membershipFormFields).values({
    key: `custom_${Math.random().toString(36).slice(2, 10)}`,
    label,
    type: type as MembershipFieldDef["type"],
    required: false,
    orderIndex: nextOrder,
    isCore: false,
  });
  revalidatePath("/console/membership/form");
}

export async function updateFormField(formData: FormData) {
  await requireModuleAccess("membership");
  const id = String(formData.get("id") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const type = String(formData.get("type") ?? "text");
  const required = formData.get("required") === "on";
  const placeholder = String(formData.get("placeholder") ?? "").trim();
  const helpText = String(formData.get("helpText") ?? "").trim();
  const options = String(formData.get("options") ?? "").trim();
  await db
    .update(membershipFormFields)
    .set({
      label,
      type: type as MembershipFieldDef["type"],
      required,
      placeholder: placeholder || null,
      helpText: helpText || null,
      options: options || null,
    })
    .where(eq(membershipFormFields.id, id));
  revalidatePath("/console/membership/form");
}

export async function deleteFormField(formData: FormData) {
  await requireModuleAccess("membership");
  const id = String(formData.get("id") ?? "");
  const [row] = await db.select({ isCore: membershipFormFields.isCore }).from(membershipFormFields).where(eq(membershipFormFields.id, id));
  if (row?.isCore) throw new Error("Field inti tidak boleh dihapus");
  await db.delete(membershipFormFields).where(eq(membershipFormFields.id, id));
  revalidatePath("/console/membership/form");
}

export async function reorderFormField(formData: FormData) {
  await requireModuleAccess("membership");
  const id = String(formData.get("id") ?? "");
  const dir = String(formData.get("dir") ?? "up");
  const rows = await db.select().from(membershipFormFields).orderBy(asc(membershipFormFields.orderIndex));
  const idx = rows.findIndex((r) => r.id === id);
  if (idx < 0) return;
  const swapWith = dir === "up" ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= rows.length) return;
  const a = rows[idx];
  const b = rows[swapWith];
  await db.update(membershipFormFields).set({ orderIndex: b.orderIndex }).where(eq(membershipFormFields.id, a.id));
  await db.update(membershipFormFields).set({ orderIndex: a.orderIndex }).where(eq(membershipFormFields.id, b.id));
  revalidatePath("/console/membership/form");
}
