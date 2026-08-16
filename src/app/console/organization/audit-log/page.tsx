import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, users } from "@/db/schema";
import { requireModuleAccess } from "@/lib/admin-scope";
import { CollapsibleSection } from "@/components/console/collapsible-section";

export default async function OrganizationAuditLogPage() {
  await requireModuleAccess("organization");
  const logs = await db
    .select({ log: auditLogs, actorName: users.name, actorEmail: users.email })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.actorUserId, users.id))
    .where(eq(auditLogs.entityType, "department"))
    .orderBy(desc(auditLogs.createdAt))
    .limit(100);

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <h1 className="text-headline-md sm:text-headline-lg text-on-background mb-2">Log Audit Organisasi</h1>
      <p className="text-body-md text-on-surface-variant mb-8">
        Riwayat perubahan struktur departemen &mdash; siapa mengubah apa, kapan.
      </p>

      <CollapsibleSection title="Riwayat Perubahan" description={`${logs.length} entri terbaru.`}>
        <div className="flex flex-col gap-2">
          {logs.length === 0 && <p className="text-body-md text-on-surface-variant">Belum ada perubahan tercatat.</p>}
          {logs.map(({ log, actorName, actorEmail }) => (
            <div key={log.id} className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-body-md font-medium text-on-background capitalize">
                  {log.action === "created" ? "Dibuat" : log.action === "updated" ? "Diperbarui" : "Diurutkan ulang"}
                </span>
                <span className="text-label-caps text-on-surface-variant">
                  {new Date(log.createdAt).toLocaleString("id-ID")}
                </span>
              </div>
              <p className="text-label-caps text-on-surface-variant">
                oleh {actorName ?? actorEmail ?? "Sistem"}
              </p>
            </div>
          ))}
        </div>
      </CollapsibleSection>
    </div>
  );
}
