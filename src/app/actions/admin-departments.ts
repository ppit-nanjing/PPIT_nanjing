"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { departments, auditLogs } from "@/db/schema";
import { hasModuleAccess } from "@/lib/admin-scope";
import { SENSITIVE_SCOPE_KEYS } from "@/lib/admin-scope-constants";

async function requireAdmin() {
  const session = await auth();
  if (!hasModuleAccess(session?.user?.adminScope ?? null, "organization")) throw new Error("Forbidden");
  return session!;
}

export async function createDepartment(formData: FormData) {
  const session = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const parentDepartmentId = String(formData.get("parentDepartmentId") ?? "") || null;
  if (!name) throw new Error("Nama wajib diisi");

  const all = await db.select().from(departments);
  const orderIndex = all.filter((d) => d.parentDepartmentId === parentDepartmentId).length;

  const [created] = await db
    .insert(departments)
    .values({ name, description: description || null, parentDepartmentId, orderIndex })
    .returning();

  await db.insert(auditLogs).values({
    actorUserId: session.user.id,
    entityType: "department",
    entityId: created.id,
    action: "created",
    afterJson: created,
  });

  revalidatePath("/console/organization");
}

export async function updateDepartment(id: string, formData: FormData) {
  const session = await requireAdmin();
  const [before] = await db.select().from(departments).where(eq(departments.id, id));
  if (!before) throw new Error("Departemen tidak ditemukan");

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!name) throw new Error("Nama wajib diisi");

  // grantsFullAdminAccess and the SENSITIVE_SCOPE_KEYS ("users"/"organization"/
  // "feedback") are self-escalation vectors: anyone with plain "organization"
  // scope could otherwise flip their own department to full admin, or hand it
  // the sensitive modules. Only an already-"full" actor may change these -
  // for anyone else, silently keep the department's existing values instead
  // of trusting what the form posted.
  const isFullAdmin = session.user.adminScope === "full";
  let grantsFullAdminAccess = before.grantsFullAdminAccess;
  let adminModuleScope = before.adminModuleScope;
  if (isFullAdmin) {
    grantsFullAdminAccess = formData.get("grantsFullAdminAccess") === "on";
    adminModuleScope = formData.getAll("adminModuleScope").map(String);
  } else {
    const submitted = formData.getAll("adminModuleScope").map(String);
    const nonSensitive = submitted.filter((k) => !SENSITIVE_SCOPE_KEYS.includes(k as (typeof SENSITIVE_SCOPE_KEYS)[number]));
    const keptSensitive = before.adminModuleScope.filter((k) =>
      SENSITIVE_SCOPE_KEYS.includes(k as (typeof SENSITIVE_SCOPE_KEYS)[number])
    );
    adminModuleScope = [...new Set([...nonSensitive, ...keptSensitive])];
  }

  const [after] = await db
    .update(departments)
    .set({ name, description: description || null, grantsFullAdminAccess, adminModuleScope })
    .where(eq(departments.id, id))
    .returning();

  await db.insert(auditLogs).values({
    actorUserId: session.user.id,
    entityType: "department",
    entityId: id,
    action: "updated",
    beforeJson: before,
    afterJson: after,
  });

  revalidatePath("/console/organization");
}

export async function moveDepartment(id: string, direction: "up" | "down") {
  const session = await requireAdmin();
  const [dept] = await db.select().from(departments).where(eq(departments.id, id));
  if (!dept) return;

  const all = await db.select().from(departments);
  const scoped = all
    .filter((d) => d.parentDepartmentId === dept.parentDepartmentId)
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const idx = scoped.findIndex((d) => d.id === id);
  const swapWith = direction === "up" ? scoped[idx - 1] : scoped[idx + 1];
  if (!swapWith) return;

  await db.update(departments).set({ orderIndex: swapWith.orderIndex }).where(eq(departments.id, dept.id));
  await db.update(departments).set({ orderIndex: dept.orderIndex }).where(eq(departments.id, swapWith.id));

  await db.insert(auditLogs).values({
    actorUserId: session.user.id,
    entityType: "department",
    entityId: id,
    action: "reordered",
    beforeJson: { orderIndex: dept.orderIndex },
    afterJson: { orderIndex: swapWith.orderIndex },
  });

  revalidatePath("/console/organization");
}
