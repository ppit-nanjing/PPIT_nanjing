"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { departments, auditLogs } from "@/db/schema";
import { hasModuleAccess } from "@/lib/admin-scope";

async function requireAdmin() {
  const session = await auth();
  if (!hasModuleAccess(session?.user?.adminScope ?? null, "organization")) throw new Error("Forbidden");
  return session!.user.id;
}

export async function createDepartment(formData: FormData) {
  const actorId = await requireAdmin();
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
    actorUserId: actorId,
    entityType: "department",
    entityId: created.id,
    action: "created",
    afterJson: created,
  });

  revalidatePath("/console/organization");
}

export async function updateDepartment(id: string, formData: FormData) {
  const actorId = await requireAdmin();
  const [before] = await db.select().from(departments).where(eq(departments.id, id));
  if (!before) throw new Error("Departemen tidak ditemukan");

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!name) throw new Error("Nama wajib diisi");

  const grantsFullAdminAccess = formData.get("grantsFullAdminAccess") === "on";
  const adminModuleScope = formData.getAll("adminModuleScope").map(String);

  const [after] = await db
    .update(departments)
    .set({ name, description: description || null, grantsFullAdminAccess, adminModuleScope })
    .where(eq(departments.id, id))
    .returning();

  await db.insert(auditLogs).values({
    actorUserId: actorId,
    entityType: "department",
    entityId: id,
    action: "updated",
    beforeJson: before,
    afterJson: after,
  });

  revalidatePath("/console/organization");
}

export async function moveDepartment(id: string, direction: "up" | "down") {
  const actorId = await requireAdmin();
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
    actorUserId: actorId,
    entityType: "department",
    entityId: id,
    action: "reordered",
    beforeJson: { orderIndex: dept.orderIndex },
    afterJson: { orderIndex: swapWith.orderIndex },
  });

  revalidatePath("/console/organization");
}
