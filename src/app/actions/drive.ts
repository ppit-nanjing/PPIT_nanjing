"use server";

import { and, eq, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { departmentMembers, departments, managementPeriods, shortLinks } from "@/db/schema";
import { listFolder, createFolder, uploadFile, renameFile, trashFile, setLinkViewer } from "@/lib/drive";
import { resolveDriveFolder } from "@/lib/drive-folders";
import { folderAccess, getCurrentPeriodId } from "@/lib/drive-access";
import { hasModuleAccess } from "@/lib/admin-scope-constants";

export type DriveItem = {
  id: string;
  name: string;
  isFolder: boolean;
  mimeType: string;
  webViewLink?: string | null;
  shortSlug?: string | null;
};

export type FolderContents = {
  driveFolderId: string;
  access: "write" | "read";
  title: string;
  periodId: string | null;
  departmentId: string | null;
  items: DriveItem[];
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

async function createAutoShortLink(targetUrl: string, title: string, periodId: string | null, actorId: string) {
  const base = slugify(title) || "berkas";
  let slug = base;
  for (let i = 0; i < 5; i++) {
    const [collision] = await db.select({ id: shortLinks.id }).from(shortLinks).where(eq(shortLinks.slug, slug)).limit(1);
    if (!collision) break;
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }
  await db.insert(shortLinks).values({
    slug,
    targetUrl,
    title,
    category: "file",
    managementPeriodId: periodId,
    createdBy: actorId,
  });
  return slug;
}

async function assertWrite(periodId: string | null, departmentId: string | null) {
  const session = await auth();
  if (!session?.user) throw new Error("Forbidden");
  // Only a documents-module admin may bypass division/period scoping. This is
  // derived from the session, never trusted from client input.
  if (hasModuleAccess(session.user.adminScope, "documents")) return;
  if (!periodId) throw new Error("Periode tidak diketahui");
  const a = await folderAccess({
    userId: session.user.id,
    adminScope: session.user.adminScope,
    periodId,
    departmentId,
  });
  if (a !== "write") throw new Error("Kamu tidak punya akses tulis ke folder ini.");
}

function isFolder(mime: string) {
  return mime === "application/vnd.google-apps.folder";
}

export async function getFolderContents(args: {
  periodId?: string;
  departmentId?: string | null;
  driveFolderId?: string;
  title?: string;
}): Promise<FolderContents> {
  const session = await auth();
  if (!session?.user) throw new Error("Forbidden");

  let driveFolderId = args.driveFolderId;
  let periodId = args.periodId ?? null;
  const departmentId = args.departmentId ?? null;

  if (!driveFolderId) {
    if (!periodId) periodId = await getCurrentPeriodId();
    if (!periodId) throw new Error("Tidak ada periode aktif.");
    driveFolderId = await resolveDriveFolder({ periodId, departmentId });
  }

  const isDocsAdmin = hasModuleAccess(session.user.adminScope, "documents");
  let access: "write" | "read";
  if (isDocsAdmin) {
    access = "write";
  } else if (!periodId) {
    access = "read";
  } else {
    const a = await folderAccess({
      userId: session.user.id,
      adminScope: session.user.adminScope,
      periodId,
      departmentId,
    });
    if (a === "none") throw new Error("Kamu tidak punya akses ke folder ini.");
    access = a;
  }

  const files = await listFolder(driveFolderId);
  const items: DriveItem[] = files.map((f) => ({
    id: f.id,
    name: f.name,
    isFolder: isFolder(f.mimeType),
    mimeType: f.mimeType,
    webViewLink: f.webViewLink ?? null,
  }));

  const links = items.filter((i) => i.webViewLink).map((i) => i.webViewLink as string);
  if (links.length && periodId) {
    const rows = await db
      .select({ slug: shortLinks.slug, targetUrl: shortLinks.targetUrl })
      .from(shortLinks)
      .where(and(eq(shortLinks.managementPeriodId, periodId), inArray(shortLinks.targetUrl, links)));
    const byUrl = new Map(rows.map((r) => [r.targetUrl, r.slug]));
    for (const it of items) if (it.webViewLink && byUrl.has(it.webViewLink)) it.shortSlug = byUrl.get(it.webViewLink)!;
  }

  let title = args.title ?? "Dokumen";
  if (departmentId && args.title === undefined) {
    const [d] = await db.select({ name: departments.name }).from(departments).where(eq(departments.id, departmentId)).limit(1);
    if (d) title = d.name;
  } else if (!departmentId && args.title === undefined && periodId) {
    const [p] = await db.select({ label: managementPeriods.label }).from(managementPeriods).where(eq(managementPeriods.id, periodId)).limit(1);
    if (p) title = p.label;
  }

  return { driveFolderId, access, title, periodId, departmentId, items };
}

export async function createDriveFolderAction(formData: FormData): Promise<void> {
  const periodId = (formData.get("periodId") as string) || null;
  const departmentIdRaw = (formData.get("departmentId") as string) || "";
  const departmentId = departmentIdRaw && departmentIdRaw !== "null" ? departmentIdRaw : null;
  const parentDriveFolderId = formData.get("parentDriveFolderId") as string;
  const name = (formData.get("name") as string)?.trim();
  if (!name) throw new Error("Nama folder wajib diisi.");
  await assertWrite(periodId, departmentId);
  await createFolder(name, parentDriveFolderId);
}

export async function uploadDriveFileAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Forbidden");
  const periodId = (formData.get("periodId") as string) || null;
  const departmentIdRaw = (formData.get("departmentId") as string) || "";
  const departmentId = departmentIdRaw && departmentIdRaw !== "null" ? departmentIdRaw : null;
  const parentDriveFolderId = formData.get("parentDriveFolderId") as string;
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) throw new Error("Pilih berkas terlebih dahulu.");
  await assertWrite(periodId, departmentId);

  const buffer = Buffer.from(await file.arrayBuffer());
  const uploaded = await uploadFile(file.name, parentDriveFolderId, buffer, file.type || "application/octet-stream");
  const webViewLink = await setLinkViewer(uploaded.id);
  await createAutoShortLink(webViewLink, file.name, periodId, session.user.id);
}

export async function renameDriveFileAction(formData: FormData): Promise<void> {
  const periodId = (formData.get("periodId") as string) || null;
  const departmentIdRaw = (formData.get("departmentId") as string) || "";
  const departmentId = departmentIdRaw && departmentIdRaw !== "null" ? departmentIdRaw : null;
  const fileId = formData.get("fileId") as string;
  const name = (formData.get("name") as string)?.trim();
  if (!name) throw new Error("Nama wajib diisi.");
  await assertWrite(periodId, departmentId);
  await renameFile(fileId, name);
}

export async function trashDriveFileAction(formData: FormData): Promise<void> {
  const periodId = (formData.get("periodId") as string) || null;
  const departmentIdRaw = (formData.get("departmentId") as string) || "";
  const departmentId = departmentIdRaw && departmentIdRaw !== "null" ? departmentIdRaw : null;
  const fileId = formData.get("fileId") as string;
  await assertWrite(periodId, departmentId);
  await trashFile(fileId);
}

export async function getMemberDepartments() {
  const session = await auth();
  if (!session?.user) throw new Error("Forbidden");
  const periodId = await getCurrentPeriodId();
  if (!periodId) return { periodId: null, myDepartmentIds: [] as string[], departments: [] as { id: string; name: string }[] };

  const mine = await db
    .select({ departmentId: departmentMembers.departmentId })
    .from(departmentMembers)
    .where(eq(departmentMembers.userId, session.user.id));
  const myIds = mine.map((m) => m.departmentId);

  const all = await db.select({ id: departments.id, name: departments.name }).from(departments).orderBy(departments.name);

  return { periodId, myDepartmentIds: myIds, departments: all };
}
