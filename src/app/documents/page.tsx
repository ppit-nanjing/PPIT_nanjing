import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getFolderContents, getMemberDepartments } from "@/app/actions/drive";
import { DriveExplorer } from "@/components/documents/drive-explorer";

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

  const sections = await Promise.all(
    departments.map(async (d) => {
      const contents = await getFolderContents({ periodId, departmentId: d.id });
      return { id: d.id, name: d.name, contents };
    }),
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6">
      <h1 className="text-headline-md sm:text-headline-lg text-on-background">Dokumen</h1>
      <p className="text-body-md text-on-surface-variant mb-6">
        Berkas divisimu bisa diedit; divisi lain hanya bisa dibaca. Buka dengan VPN jika Drive terblokir.
      </p>

      <div className="flex flex-col gap-5">
        {sections.map((s) => (
          <DriveExplorer
            key={s.id}
            driveFolderId={s.contents.driveFolderId}
            access={s.contents.access}
            title={s.contents.title}
            periodId={s.contents.periodId}
            departmentId={s.contents.departmentId}
            items={s.contents.items}
          />
        ))}
      </div>
    </div>
  );
}
