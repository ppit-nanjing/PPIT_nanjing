import { db } from "@/db";
import { departments } from "@/db/schema";
import { DepartmentManager } from "@/components/console/department-manager";
import { CollapsibleSection } from "@/components/console/collapsible-section";
import { requireModuleAccess } from "@/lib/admin-scope";

export default async function ConsoleOrganizationPage() {
  const session = await requireModuleAccess("organization");
  const all = await db.select().from(departments);
  const isFullAdmin = session.user.adminScope === "full";

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-headline-md sm:text-headline-lg text-on-background mb-2">Struktur Organisasi</h1>
          <p className="text-body-md text-on-surface-variant">
            Kelola departemen dan divisi PPIT Nanjing. Perubahan tercatat di{" "}
            <a href="/console/organization/audit-log" className="text-primary-container underline">
              log audit
            </a>
            .
          </p>
        </div>
      </div>
      <CollapsibleSection title="Manajemen Departemen & Divisi">
        <DepartmentManager departments={all} isFullAdmin={isFullAdmin} />
      </CollapsibleSection>
    </div>
  );
}
