import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getFolderContents, getMemberDepartments } from "@/lib/drive-queries";
import { preloadDriveFolders, resolveDriveFolder } from "@/lib/drive-folders";
import { DriveExplorer } from "@/components/documents/drive-explorer";

type Section =
  | { id: string; name: string; ok: true; contents: Awaited<ReturnType<typeof getFolderContents>> }
  | { id: string; name: string; ok: false };

export default async function MemberDocumentsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const { periodId, departments } = await getMemberDepartments();

  if (!periodId) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-headline-md text-on-background mb-2">Dokumen</h1>
        <p className="text-body-md text-on-surface-variant">
          Belum ada periode kepengurusan aktif, sehingga folder dokumen belum tersedia.
        </p>
      </div>
    );
  }

  // One query for every division's already-resolved Drive folder instead of
  // resolveDriveFolder() re-querying per division below.
  const preloadedFolders = await preloadDriveFolders(periodId);

  // Every department's resolveDriveFolder call below falls back to creating
  // this same shared period-level parent folder if it doesn't exist yet.
  // Resolving it here, sequentially, before the parallel fan-out guarantees
  // only one of those N calls ever needs to create it - otherwise, on the
  // very first page load for a brand-new period, all N department branches
  // would independently miss it in the (still-empty) preload map and race
  // each other to create duplicate Drive folders for it.
  if (!preloadedFolders.has("")) {
    preloadedFolders.set("", await resolveDriveFolder({ periodId, departmentId: null, preloaded: preloadedFolders }));
  }

  const sections: Section[] = await Promise.all(
    departments.map(async (d): Promise<Section> => {
      try {
        const contents = await getFolderContents({ periodId, departmentId: d.id, title: d.name, preloadedFolders });
        return { id: d.id, name: d.name, ok: true, contents };
      } catch {
        // One division's Drive call failing (SA not shared on that folder,
        // transient error, quota) shouldn't take down every other section
        // that would have loaded fine.
        return { id: d.id, name: d.name, ok: false };
      }
    }),
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6">
      <h1 className="text-headline-md sm:text-headline-lg text-on-background">Dokumen</h1>
      <p className="text-body-md text-on-surface-variant mb-6">
        Berkas divisimu bisa diedit; divisi lain hanya bisa dibaca. Buka dengan VPN jika Drive terblokir.
      </p>

      <div className="flex flex-col gap-5">
        {sections.map((s) =>
          s.ok ? (
            <DriveExplorer
              key={s.id}
              driveFolderId={s.contents.driveFolderId}
              access={s.contents.access}
              title={s.contents.title}
              periodId={s.contents.periodId}
              departmentId={s.contents.departmentId}
              items={s.contents.items}
            />
          ) : (
            <div
              key={s.id}
              className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 text-body-md text-on-surface-variant"
            >
              Folder {s.name} tidak bisa dimuat saat ini.
            </div>
          ),
        )}
      </div>
    </div>
  );
}
