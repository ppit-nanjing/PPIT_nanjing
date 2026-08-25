"use server";

import { asc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import {
  auditLogs,
  departments,
  departmentMembers,
  membershipApplications,
  membershipFormFields,
  membershipFormMeta,
  recruitmentPeriods,
  users,
} from "@/db/schema";
import { requireModuleAccess } from "@/lib/admin-scope";
import { notificationTemplates } from "@/db/schema";
import { getTemplateDef, renderTemplate } from "@/lib/notification-templates";
import { createTemplatedNotification } from "@/lib/notifications";
import { sendEmail, type SendResult } from "@/lib/email";
import { renderMembershipEmail, renderMembershipEmailText } from "@/lib/membership-email";
import { CORE_KEYS, DEFAULT_FIELDS, QUESTION_BY_KEY, GRID_TYPES, canDeleteField, type MembershipFieldDef } from "@/lib/membership-form";

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
    config: (r.config as MembershipFieldDef["config"]) ?? undefined,
    isCore: r.isCore,
  }));
}

export async function submitMembershipApplication(recruitmentPeriodId: string, formData: FormData) {
  const [period] = await db.select().from(recruitmentPeriods).where(eq(recruitmentPeriods.id, recruitmentPeriodId));
  if (!period?.isOpen) throw new Error("Pendaftaran sedang tidak dibuka");

  const session = await auth();
  const fields = await getFormFields();
  const meta = await getFormMeta();

  const responses: Record<string, unknown> = {};
  for (const f of fields) {
    if (f.type === "section") continue;
    if (GRID_TYPES.includes(f.type)) {
      const rows = f.config?.rows ?? [];
      const map: Record<string, unknown> = {};
      for (let i = 0; i < rows.length; i++) {
        if (f.type === "grid_checkbox") {
          map[i] = formData.getAll(`${f.key}::${i}`).map((v) => String(v).trim()).filter(Boolean);
        } else {
          map[i] = String(formData.get(`${f.key}::${i}`) ?? "").trim();
        }
      }
      responses[f.key] = map;
      continue;
    }
    if (f.type === "multiselect") {
      // Multiple checkbox values arrive as repeated entries; store as a JSON array.
      responses[f.key] = formData.getAll(f.key).map((v) => String(v).trim()).filter(Boolean);
    } else {
      const v = String(formData.get(f.key) ?? "").trim();
      responses[f.key] = f.type === "checkbox" ? (v === "true" ? "true" : "false") : v;
    }
  }

  const fullName = String(responses[CORE_KEYS.fullName] ?? "").trim();
  // With "kumpulkan email" off the question is hidden for signed-in users, so
  // take the address from their account instead.
  if (!meta.collectEmail && !String(responses[CORE_KEYS.email] ?? "").trim() && session?.user?.email) {
    responses[CORE_KEYS.email] = session.user.email;
  }
  const email = String(responses[CORE_KEYS.email] ?? "").trim();
  if (!fullName) throw new Error("Nama wajib diisi");
  if (!email) throw new Error("Email wajib diisi");

  for (const f of fields) {
    if (!f.required) continue;
    if (GRID_TYPES.includes(f.type)) {
      const rows = f.config?.rows ?? [];
      const map = (responses[f.key] as Record<string, unknown>) ?? {};
      let ok = true;
      for (let i = 0; i < rows.length; i++) {
        const ans = map[String(i)];
        if (f.type === "grid_checkbox") {
          if (!Array.isArray(ans) || ans.length === 0) ok = false;
        } else if (!ans) ok = false;
        if (!ok) break;
      }
      if (!ok) throw new Error(`Field "${f.label}" wajib diisi`);
      continue;
    }
    const v = responses[f.key];
    const empty =
      f.type === "checkbox"
        ? v !== "true"
        : f.type === "multiselect"
          ? !Array.isArray(v) || v.length === 0
          : !String(v ?? "").trim();
    if (empty) throw new Error(`Field "${f.label}" wajib diisi`);
  }

  await db.insert(membershipApplications).values({
    recruitmentPeriodId,
    userId: session?.user?.id ?? null,
    fullName,
    email,
    whatsapp: (responses[CORE_KEYS.whatsapp] as string) || null,
    university: (responses[CORE_KEYS.university] as string) || null,
    major: (responses[CORE_KEYS.major] as string) || null,
    expectedGraduation: (responses[CORE_KEYS.expectedGraduation] as string) || null,
    divisionInterest: (responses[CORE_KEYS.divisionInterest] as string) || null,
    motivation: (responses[CORE_KEYS.motivation] as string) || null,
    commitment: (responses[CORE_KEYS.commitment] as string) || null,
    responses,
  });

  redirect("/join-us/success");
}

const STATUS_VALUES = ["pending", "reviewed", "accepted", "rejected"] as const;

// Resolves a template to its final subject/body: an admin-edited row in
// notification_templates wins, otherwise the registry default. Shared by the
// in-app notification and the email so the two never drift apart.
async function resolveTemplate(key: string, variables: Record<string, string>) {
  const def = getTemplateDef(key);
  if (!def) return null;
  const [row] = await db
    .select()
    .from(notificationTemplates)
    .where(eq(notificationTemplates.key, key))
    .limit(1);
  return {
    subject: renderTemplate(row?.subject?.trim() || def.defaultSubject, variables),
    body: renderTemplate(row?.bodyTemplate?.trim() || def.defaultBody, variables),
  };
}

export async function updateMembershipStatus(formData: FormData) {
  const session = await requireModuleAccess("membership");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!STATUS_VALUES.includes(status as (typeof STATUS_VALUES)[number])) throw new Error("Status tidak valid");
  // The decision email is irreversible and hits the applicant's inbox - the
  // checkbox (default on) lets a reviewer record an internal-only status
  // without notifying anyone.
  const notifyApplicant = formData.get("notifyApplicant") !== null;

  const [before] = await db
    .select({ status: membershipApplications.status })
    .from(membershipApplications)
    .where(eq(membershipApplications.id, id));

  await db.update(membershipApplications).set({ status: status as (typeof STATUS_VALUES)[number], reviewedAt: new Date() }).where(eq(membershipApplications.id, id));

  // Announce the decision once, only when the status actually changes into a
  // final one - re-saving "Diterima" must not email the applicant again.
  const isDecision = status === "accepted" || status === "rejected";
  const changed = before?.status !== status;
  let decisionEmail: string | null = null;
  // Provisioning races (applicant signs up while being approved, two
  // reviewers clicking at once) must not sink the whole status save - record
  // the failure in the audit trail instead and keep going.
  let provisioning: string | null = null;
  if (isDecision && changed) {
    if (status === "accepted") {
      try {
        await provisionAcceptedApplicant(id);
      } catch (err) {
        provisioning = `failed: ${err instanceof Error ? err.message : "unknown"}`;
        console.error("[membership] failed to provision accepted applicant:", err);
      }
    }
    if (!notifyApplicant) {
      decisionEmail = "skipped";
    } else {
      const result = await notifyMembershipDecision(id, status);
      decisionEmail = result.ok ? "sent" : `failed: ${result.reason ?? "unknown"}`;
    }
  }

  // Review accountability: who decided what, when, and whether the applicant
  // was actually notified. Rendered on the application detail page.
  await db.insert(auditLogs).values({
    actorUserId: session.user.id,
    entityType: "membership_application",
    entityId: id,
    action: isDecision && changed ? `decision_${status}` : "status_changed",
    beforeJson: { status: before?.status ?? null },
    afterJson: { status, decisionEmail, provisioning },
  });

  revalidatePath("/console/membership");
  revalidatePath(`/console/membership/${id}`);
}

// Accepting used to be a dead end: it flipped two columns and sent an email,
// but nobody became a member of anything. This makes an accepted applicant
// reachable in-app and files them under the division they asked for:
// - no account yet -> create one ("invited"; their first Google sign-in is
//   auto-linked by auth.ts's signIn callback, which then activates it)
// - existing invited account (admin pre-provisioned) -> activated directly
// - divisionInterest matching a department name (case-insensitive) -> added
//   to that department as "Anggota"; no match = left unassigned, not guessed.
async function provisionAcceptedApplicant(applicationId: string) {
  const [app] = await db
    .select({
      userId: membershipApplications.userId,
      fullName: membershipApplications.fullName,
      email: membershipApplications.email,
      divisionInterest: membershipApplications.divisionInterest,
    })
    .from(membershipApplications)
    .where(eq(membershipApplications.id, applicationId));
  if (!app) return;

  let userId = app.userId;
  if (!userId) {
    const [existing] = await db.select({ id: users.id, status: users.status }).from(users).where(eq(users.email, app.email)).limit(1);
    if (existing) {
      userId = existing.id;
      if (existing.status === "invited") {
        await db.update(users).set({ status: "active" }).where(eq(users.id, existing.id));
      }
    } else {
      const [created] = await db
        .insert(users)
        .values({ name: app.fullName, email: app.email, status: "invited" })
        .returning();
      userId = created.id;
    }
    await db.update(membershipApplications).set({ userId }).where(eq(membershipApplications.id, applicationId));
  }
  if (!userId || !app.divisionInterest) return;

  const [dept] = await db
    .select({ id: departments.id })
    .from(departments)
    .where(sql`lower(${departments.name}) = lower(${app.divisionInterest})`)
    .limit(1);
  if (!dept) return;
  await db.insert(departmentMembers).values({ userId, departmentId: dept.id, position: "Anggota" }).onConflictDoNothing();
}

// Sends the decision to the applicant: in-app when they have an account, and
// always by email (email is NOT NULL on every application). A failure here must
// never roll back or throw past the status update the admin just made - the
// SendResult is returned so updateMembershipStatus can record the outcome in
// the audit log instead of the failure vanishing into console.error.
async function notifyMembershipDecision(applicationId: string, status: "accepted" | "rejected"): Promise<SendResult> {
  try {
    const [app] = await db
      .select({
        fullName: membershipApplications.fullName,
        email: membershipApplications.email,
        userId: membershipApplications.userId,
        batchLabel: recruitmentPeriods.batchLabel,
      })
      .from(membershipApplications)
      .leftJoin(recruitmentPeriods, eq(membershipApplications.recruitmentPeriodId, recruitmentPeriods.id))
      .where(eq(membershipApplications.id, applicationId));
    if (!app) return { ok: false, skipped: true, reason: "aplikasi tidak ditemukan" };

    const key = status === "accepted" ? "membership_accepted" : "membership_rejected";
    const variables = { fullName: app.fullName, batchLabel: app.batchLabel ?? "" };
    const resolved = await resolveTemplate(key, variables);
    if (!resolved) return { ok: false, skipped: true, reason: "template tidak ditemukan" };

    if (app.userId) {
      await createTemplatedNotification({
        userId: app.userId,
        templateKey: key,
        variables,
        relatedEntityType: "membership_application",
        relatedEntityId: applicationId,
      });
    }

    return await sendEmail({
      to: app.email,
      subject: resolved.subject,
      html: renderMembershipEmail({ heading: resolved.subject, body: resolved.body }),
      text: renderMembershipEmailText({ heading: resolved.subject, body: resolved.body }),
    });
  } catch (err) {
    console.error("[membership] failed to announce decision:", err);
    return { ok: false, skipped: false, reason: err instanceof Error ? err.message : "unknown error" };
  }
}

export async function updateMembershipNote(formData: FormData) {
  await requireModuleAccess("membership");
  const id = String(formData.get("id") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  await db.update(membershipApplications).set({ note: note || null }).where(eq(membershipApplications.id, id));
  revalidatePath(`/console/membership/${id}`);
}

export async function deleteMembershipApplication(id: string) {
  await requireModuleAccess("membership");
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
  const [meta] = await db.select({ defaultRequired: membershipFormMeta.defaultRequired }).from(membershipFormMeta).limit(1);
  const maxRow = await db.select({ o: membershipFormFields.orderIndex }).from(membershipFormFields).orderBy(asc(membershipFormFields.orderIndex));
  const nextOrder = maxRow.length ? Math.max(...maxRow.map((r) => r.o)) + 1 : 0;
  await db.insert(membershipFormFields).values({
    key: `custom_${Math.random().toString(36).slice(2, 10)}`,
    label,
    type: type as MembershipFieldDef["type"],
    required: meta?.defaultRequired ?? false,
    orderIndex: nextOrder,
    isCore: false,
  });
  revalidatePath("/console/membership/form");
}

// Inserts a question from the built-in question bank (referensi pertanyaan)
// into the live form. The template key maps to QUESTION_BY_KEY.
export async function createFormFieldFromTemplate(formData: FormData) {
  await requireModuleAccess("membership");
  const templateKey = String(formData.get("templateKey") ?? "");
  const tpl = QUESTION_BY_KEY[templateKey];
  if (!tpl) throw new Error("Template tidak ditemukan");

  const maxRow = await db
    .select({ o: membershipFormFields.orderIndex })
    .from(membershipFormFields)
    .orderBy(asc(membershipFormFields.orderIndex));
  const nextOrder = maxRow.length ? Math.max(...maxRow.map((r) => r.o)) + 1 : 0;

  await db.insert(membershipFormFields).values({
    key: `tpl_${templateKey}_${Math.random().toString(36).slice(2, 8)}`,
    label: tpl.label,
    type: tpl.type,
    placeholder: tpl.placeholder ?? null,
    helpText: tpl.helpText ?? null,
    required: tpl.required ?? false,
    options: tpl.options ? tpl.options.join("\n") : null,
    config: tpl.config ?? null,
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
  const configRaw = String(formData.get("config") ?? "").trim();
  let config: MembershipFieldDef["config"] | null = null;
  if (configRaw) {
    try {
      const parsed = JSON.parse(configRaw);
      if (parsed && typeof parsed === "object") config = parsed as MembershipFieldDef["config"];
    } catch {
      // ignore malformed config; leave as null
    }
  }
  await db
    .update(membershipFormFields)
    .set({
      label,
      type: type as MembershipFieldDef["type"],
      required,
      placeholder: placeholder || null,
      helpText: helpText || null,
      options: options || null,
      config,
    })
    .where(eq(membershipFormFields.id, id));
  revalidatePath("/console/membership/form");
}

export async function deleteFormField(formData: FormData) {
  await requireModuleAccess("membership");
  const id = String(formData.get("id") ?? "");
  const [row] = await db.select({ key: membershipFormFields.key }).from(membershipFormFields).where(eq(membershipFormFields.id, id));
  if (row && !canDeleteField(row.key)) throw new Error("Nama dan email tidak bisa dihapus — keduanya dipakai sebagai identitas pendaftar.");
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

// Move a field to an absolute position in the ordered list (used by drag & drop).
export async function moveFormField(id: string, toIndex: number) {
  await requireModuleAccess("membership");
  const rows = await db.select().from(membershipFormFields).orderBy(asc(membershipFormFields.orderIndex));
  const from = rows.findIndex((r) => r.id === id);
  if (from < 0) return;
  const [moved] = rows.splice(from, 1);
  const clamped = Math.max(0, Math.min(toIndex, rows.length));
  rows.splice(clamped, 0, moved);
  await db.transaction(async (tx) => {
    for (let i = 0; i < rows.length; i++) {
      await tx.update(membershipFormFields).set({ orderIndex: i }).where(eq(membershipFormFields.id, rows[i].id));
    }
  });
  revalidatePath("/console/membership/form");
}

// Duplicate a field (clone) right after the original — used by the ⋮ menu.
export async function duplicateFormField(id: string) {
  await requireModuleAccess("membership");
  const [src] = await db.select().from(membershipFormFields).where(eq(membershipFormFields.id, id));
  if (!src) return;
  await db.insert(membershipFormFields).values({
    key: src.key,
    label: `${src.label} (salinan)`,
    type: src.type,
    placeholder: src.placeholder,
    helpText: src.helpText,
    required: src.required,
    options: src.options,
    config: src.config,
    isCore: false,
    orderIndex: src.orderIndex + 0.5,
  });
  const all = await db.select().from(membershipFormFields).orderBy(asc(membershipFormFields.orderIndex));
  await db.transaction(async (tx) => {
    for (let i = 0; i < all.length; i++) {
      await tx.update(membershipFormFields).set({ orderIndex: i }).where(eq(membershipFormFields.id, all[i].id));
    }
  });
  revalidatePath("/console/membership/form");
}

// ---- Form settings (admin "Setelan") ----

export async function getFormMeta() {
  const [row] = await db.select().from(membershipFormMeta).limit(1);
  if (row) return row;
  const [created] = await db.insert(membershipFormMeta).values({}).returning();
  return created;
}

export async function updateFormMeta(formData: FormData) {
  await requireModuleAccess("membership");
  const title = String(formData.get("title") ?? "").trim() || "Formulir Pendaftaran Anggota PPIT Nanjing";
  const description = String(formData.get("description") ?? "").trim();
  const confirmationMessage = String(formData.get("confirmationMessage") ?? "").toString().trim() || "Terima kasih! Pendaftaran kamu sudah kami terima.";
  const bannerEnabled = formData.get("bannerEnabled") === "on";
  const isQuiz = formData.get("isQuiz") === "on";
  const collectEmail = formData.get("collectEmail") === "on";
  const shuffle = formData.get("shuffle") === "on";
  const showProgress = formData.get("showProgress") === "on";
  const defaultRequired = formData.get("defaultRequired") === "on";
  const spreadsheetUrlVal = String(formData.get("spreadsheetUrl") ?? "").trim() || null;
  const [row] = await db.select({ id: membershipFormMeta.id }).from(membershipFormMeta).limit(1);
  if (row) {
    await db
      .update(membershipFormMeta)
      .set({
        title,
        description,
        confirmationMessage,
        bannerEnabled,
        isQuiz,
        collectEmail,
        shuffle,
        showProgress,
        defaultRequired,
        spreadsheetUrl: spreadsheetUrlVal,
        updatedAt: new Date(),
      })
      .where(eq(membershipFormMeta.id, row.id));
  } else {
    await db
      .insert(membershipFormMeta)
      .values({
        title,
        description,
        confirmationMessage,
        bannerEnabled,
        isQuiz,
        collectEmail,
        shuffle,
        showProgress,
        defaultRequired,
        spreadsheetUrl: spreadsheetUrlVal,
      });
  }
  revalidatePath("/console/membership/form");
  revalidatePath("/join-us");
}

// ---- Recruitment periods (admin) ----

// /join-us reads the latest period's `isOpen`; until now flipping it required
// running a seed script against the prod DB - these two actions are the
// missing admin surface for that.

export async function setRecruitmentPeriodOpen(formData: FormData) {
  await requireModuleAccess("membership");
  const id = String(formData.get("id") ?? "");
  // FormData only carries strings - "true"/"false" keeps this invocable both
  // from plain <form> posts and as a ConfirmButton action reference.
  const open = String(formData.get("open") ?? "") === "true";
  if (!id) throw new Error("Periode tidak dikenal.");
  await db.update(recruitmentPeriods).set({ isOpen: open }).where(eq(recruitmentPeriods.id, id));
  revalidatePath("/console/membership");
  revalidatePath("/join-us");
}

export async function createRecruitmentPeriod(formData: FormData) {
  await requireModuleAccess("membership");
  const batchLabel = String(formData.get("batchLabel") ?? "").trim();
  if (!batchLabel) throw new Error("Nama batch wajib diisi.");
  const opensAtRaw = String(formData.get("opensAt") ?? "").trim();
  const closesAtRaw = String(formData.get("closesAt") ?? "").trim();
  await db.insert(recruitmentPeriods).values({
    batchLabel,
    // New periods start closed - opening is an explicit, separate decision.
    isOpen: false,
    opensAt: opensAtRaw ? new Date(opensAtRaw) : null,
    closesAt: closesAtRaw ? new Date(closesAtRaw) : null,
  });
  revalidatePath("/console/membership");
  revalidatePath("/join-us");
}
