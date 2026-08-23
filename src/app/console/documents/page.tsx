import Link from "next/link";
import { db } from "@/db";
import { managementPeriods } from "@/db/schema";
import { requireModuleAccess } from "@/lib/admin-scope";
import { getCurrentPeriodId } from "@/lib/drive-access";
import { getFolderContents } from "@/app/actions/drive";
import { DriveExplorer } from "@/components/documents/drive-explorer";

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

  if (folder) {
    try {
      contents = await getFolderContents({ driveFolderId: folder, title: "Folder" });
    } catch (e) {
      if (e instanceof Error && /dikonfigurasi/i.test(e.message)) notConfigured = true;
      else throw e;
    }
  } else if (!activePeriodId) {
    noPeriod = true;
  } else {
    try {
      contents = await getFolderContents({ periodId: activePeriodId, departmentId: null });
    } catch (e) {
      if (e instanceof Error && /dikonfigurasi/i.test(e.message)) notConfigured = true;
      else throw e;
    }
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <h1 className="text-headline-md sm:text-headline-lg text-on-background">Dokumen</h1>
      <p className="text-body-md text-on-surface-variant mb-4">
        Berkas organisasi di Google Drive. Admin bisa mengelola semua folder periode &amp; divisi.
      </p>

      {notConfigured && (
        <p className="text-body-md text-on-error-container bg-error-container/40 rounded-lg px-4 py-3 mb-4">
          Google Drive belum dikonfigurasi. Setel <code>GOOGLE_DRIVE_ROOT_FOLDER_ID</code> dan{" "}
          <code>GOOGLE_DRIVE_SA_JSON</code> di environment.
        </p>
      )}

      {noPeriod && (
        <p className="text-body-md text-on-surface-variant bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-3">
          Belum ada periode kepengurusan aktif. Buat periode di menu Tautan → Tambah periode, lalu tandai sebagai aktif.
        </p>
      )}

      {contents && (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <form method="get" className="flex items-end gap-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Periode</span>
                <select
                  name="period"
                  defaultValue={activePeriodId ?? "all"}
                  onChange={(e) => e.currentTarget.form?.requestSubmit()}
                  className="bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-body-md"
                >
                  <option value="all">Pilih periode…</option>
                  {periods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
            </form>
            {folder && (
              <Link
                href={`/console/documents${activePeriodId ? `?period=${activePeriodId}` : ""}`}
                className="text-label-caps uppercase tracking-wide text-primary-container hover:text-primary self-end pb-2.5"
              >
                ← Semua divisi
              </Link>
            )}
          </div>

          <DriveExplorer
            driveFolderId={contents.driveFolderId}
            access={contents.access}
            title={folder ? "Folder" : contents.title}
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
