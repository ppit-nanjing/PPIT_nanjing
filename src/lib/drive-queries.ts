import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { departments, managementPeriods, shortLinks } from "@/db/schema";
import { listFolder } from "@/lib/drive";
import { resolveDriveFolder } from "@/lib/drive-folders";
import { folderAccess, getCurrentPeriodId, getUserDepartmentIds } from "@/lib/drive-access";
import { hasModuleAccess } from "@/lib/admin-scope-constants";

// Read-only Drive data loaders, deliberately kept out of the "use server"
// actions/drive.ts file. Both exports here are called during render from
// Server Components (console/documents & documents pages), never from
// client code - so, unlike a "use server" action, they never get a
// client-invokable action reference. The `import "server-only"` above backs
// that up structurally: it makes this file (and anything that imports it)
// fail to build the moment it's ever pulled into a client bundle, instead of
// relying on this comment alone to keep it that way.
//
// folderAccess()'s own DB lookups (current period, caller's department
// memberships) are request-deduplicated via React's cache() in
// drive-access.ts, so looping getFolderContents over many departments in
// one request (the member documents page) doesn't re-run those queries per
// department - no caller-suppliable "trust me" hint needed for that part.
// preloadedFolders below is a different kind of optimization (batching N
// distinct per-department drive_folders rows into one query) that cache()
// can't provide, so it's still threaded through explicitly.

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

function isFolder(mime: string) {
  return mime === "application/vnd.google-apps.folder";
}

export async function getFolderContents(args: {
  periodId?: string;
  departmentId?: string | null;
  driveFolderId?: string;
  title?: string;
  // Pre-fetched drive_folders rows for the whole period, so callers looping
  // over every department (e.g. the member documents page) don't run
  // resolveDriveFolder's select once per department. See preloadDriveFolders().
  preloadedFolders?: Map<string, string>;
}): Promise<FolderContents> {
  const session = await auth();
  if (!session?.user) throw new Error("Forbidden");

  const isDocsAdmin = hasModuleAccess(session.user.adminScope, "documents");

  let driveFolderId = args.driveFolderId;
  let periodId = args.periodId ?? null;
  const departmentId = args.departmentId ?? null;

  if (driveFolderId && !isDocsAdmin) {
    // Raw folder-id navigation (the console's ?folder= subfolder browsing)
    // bypasses the (periodId, departmentId) derivation below entirely, which
    // is how a non-admin caller could otherwise read a folder from an
    // inactive period or skip the division check - only a documents/full
    // admin, who's allowed to read+write everywhere anyway, may use it.
    throw new Error("Kamu tidak punya akses ke folder ini.");
  }

  if (!driveFolderId) {
    if (!periodId) periodId = await getCurrentPeriodId();
    if (!periodId) throw new Error("Tidak ada periode aktif.");
    driveFolderId = await resolveDriveFolder({ periodId, departmentId, preloaded: args.preloadedFolders });
  }

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

export async function getMemberDepartments() {
  const session = await auth();
  if (!session?.user) throw new Error("Forbidden");
  const periodId = await getCurrentPeriodId();
  if (!periodId) return { periodId: null, myDepartmentIds: [] as string[], departments: [] as { id: string; name: string }[] };

  // Same cache()-wrapped lookup folderAccess() uses - sharing it means the
  // membership row for this user is only fetched once per request even
  // though both this function and every getFolderContents call below
  // (indirectly, via folderAccess) ask for it.
  const myIds = await getUserDepartmentIds(session.user.id);

  const all = await db.select({ id: departments.id, name: departments.name }).from(departments).orderBy(departments.name);

  return { periodId, myDepartmentIds: myIds, departments: all };
}
