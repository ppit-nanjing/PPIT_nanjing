import Link from "next/link";
import { db } from "@/db";
import { managementPeriods } from "@/db/schema";
import { requireModuleAccess } from "@/lib/admin-scope";
import { getCurrentPeriodId } from "@/lib/drive-access";
import { getFolderContents } from "@/lib/drive-queries";
import { DriveNotConfiguredError, getFileMeta } from "@/lib/drive";
import { DriveExplorer } from "@/components/documents/drive-explorer";
import { PeriodPicker } from "@/components/documents/period-picker";
import { GuideButton } from "@/components/console/guide-button";
import { getGuide } from "@/lib/guides";

export default async function ConsoleDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; folder?: string }>;
}) {
  await requireModuleAccess("documents");
  const { period, folder } = await searchParams;

  const currentPeriodId = await getCurrentPeriodId();
  const activePeriodId = period && period !== "all" ? period : currentPeriodId;
  const periods = await db
    .select({ id: managementPeriods.id, label: managementPeriods.label })
    .from(managementPeriods)
    .orderBy(managementPeriods.label);

  let contents = null;
  let notConfigured = false;
  let noPeriod = false;
  let driveError: string | null = null;
  // Real folder name for the breadcrumb when browsing a subfolder (?folder=);
  // the placeholder used to be the literal string "Folder".
  let folderName: string | null = null;

  if (folder) {
    try {
      contents = await getFolderContents({ driveFolderId: folder });
      const meta = await getFileMeta(folder);
      folderName = meta.name ?? null;
    } catch (e) {
      if (e instanceof DriveNotConfiguredError) notConfigured = true;
      else driveError = e instanceof Error ? e.message : "Gagal memuat folder.";
    }
  } else if (!activePeriodId) {
    noPeriod = true;
  } else {
    try {
      contents = await getFolderContents({ periodId: activePeriodId, departmentId: null });
    } catch (e) {
      if (e instanceof DriveNotConfiguredError) notConfigured = true;
      else driveError = e instanceof Error ? e.message : "Gagal memuat dokumen.";
    }
  }

  const guide = await getGuide("dokumen");

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-headline-md sm:text-headline-lg text-on-background">Dokumen</h1>
        {guide && <GuideButton title={guide.title} content={guide.content} docSlug="dokumen" />}
      </div>
      <p className="text-body-md text-on-surface-variant mb-4">
        Berkas organisasi di Google Drive. Admin bisa mengelola semua folder periode &amp; divisi.
      </p>

      {notConfigured && (
        <p className="text-body-md text-on-error-container bg-error-container/40 rounded-lg px-4 py-3 mb-4">
          Google Drive belum dikonfigurasi. Setel <code>GOOGLE_DRIVE_ROOT_FOLDER_ID</code> dan{" "}
          <code>GOOGLE_DRIVE_SA_JSON</code> di environment.
        </p>
      )}

      {driveError && (
        <p className="text-body-md text-on-error-container bg-error-container/40 rounded-lg px-4 py-3 mb-4">
          {driveError}
        </p>
      )}

      {noPeriod && (
        <p className="text-body-md text-on-surface-variant bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-3">
          Belum ada periode kepengurusan aktif. Buat periode di menu Tautan → Tambah periode, lalu tandai sebagai aktif.
        </p>
      )}

      {contents && (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <PeriodPicker periods={periods} activePeriodId={activePeriodId} />
          </div>
          {folder ? (
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-body-sm text-on-surface-variant mb-4 min-w-0">
              <Link
                href={`/console/documents${activePeriodId ? `?period=${activePeriodId}` : ""}`}
                className="text-primary-container hover:text-primary shrink-0"
              >
                Semua divisi
              </Link>
              <span aria-hidden>/</span>
              <span className="truncate">{folderName ?? "Folder"}</span>
            </nav>
          ) : (
            <div className="mb-4" />
          )}

          <DriveExplorer
            driveFolderId={contents.driveFolderId}
            access={contents.access}
            title={folder ? (folderName ?? contents.title) : contents.title}
            periodId={contents.periodId}
            departmentId={contents.departmentId}
            items={contents.items}
            folderNavigable
          />
        </>
      )}
    </div>
  );
}
