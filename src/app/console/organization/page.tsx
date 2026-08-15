import { db } from "@/db";
import { departments } from "@/db/schema";
import { DepartmentManager } from "@/components/console/department-manager";
import { requireModuleAccess } from "@/lib/admin-scope";

export default async function ConsoleOrganizationPage() {
  const session = await requireModuleAccess("organization");
  const all = await db.select().from(departments);
  const isFullAdmin = session.user.adminScope === "full";

  return (
    <div className="px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-headline-lg text-on-background mb-2">Struktur Organisasi</h1>
          <p className="text-body-md text-on-surface-variant">
            Kelola departemen dan divisi PPIT Nanjing. Perubahan tercatat di{" "}
            <a href="/console/organization/audit-log" className="text-primary-container underline">
              log audit
            </a>
            .
          </p>
        </div>
      </div>
      <DepartmentManager departments={all} isFullAdmin={isFullAdmin} />
    </div>
  );
}
