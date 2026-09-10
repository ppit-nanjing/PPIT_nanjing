import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { auditLogs, users } from "@/db/schema";
import { requireModuleAccess } from "@/lib/admin-scope";
import { CollapsibleSection } from "@/components/console/collapsible-section";
import { summarizeAuditChange } from "@/lib/audit-diff";

// Semua perubahan/hapus baris sensus oleh pengurus. Hidup lebih lama dari
// halaman detail (baris yang dihapus tidak punya detail lagi).
export default async function SensusAuditLogPage() {
  await requireModuleAccess("sensus");
  const logs = await db
    .select({ log: auditLogs, actorName: users.name, actorEmail: users.email })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.actorUserId, users.id))
    .where(eq(auditLogs.entityType, "sensus_profile"))
    .orderBy(desc(auditLogs.createdAt))
    .limit(100);

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <Link href="/console/sensus" className="text-label-caps text-secondary uppercase hover:text-on-background">
        &larr; Kembali ke Sensus
      </Link>
      <h1 className="text-headline-md sm:text-headline-lg text-on-background mt-2 mb-2">Log Perubahan Sensus</h1>
      <p className="text-body-md text-on-surface-variant mb-8">
        Siapa mengubah / menghapus data sensus siapa, dan kapan. 100 entri terbaru.
      </p>

      <CollapsibleSection title={`Riwayat (${logs.length})`}>
        {logs.length === 0 ? (
          <p className="text-body-md text-on-surface-variant">Belum ada perubahan tercatat.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {logs.map(({ log, actorName, actorEmail }) => {
              const snap = (log.action === "deleted" ? log.beforeJson : log.afterJson) as
                | Record<string, unknown>
                | null;
              const name = snap && typeof snap === "object" ? String(snap.fullName ?? "") : "";
              return (
                <div
                  key={log.id}
                  className="bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-3 text-body-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <span className="text-on-background">
                      {log.action === "deleted" ? "Dihapus" : "Diperbarui"}
                      {name ? ` — ${name}` : ""}
                      {log.action !== "deleted" && log.entityId ? (
                        <>
                          {" · "}
                          <Link
                            href={`/console/sensus/${log.entityId}`}
                            className="text-primary-container hover:text-primary"
                          >
                            buka
                          </Link>
                        </>
                      ) : null}
                    </span>
                    <span className="text-label-caps text-on-surface-variant">
                      {new Date(log.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                    </span>
                  </div>
                  <p className="text-on-surface-variant mt-0.5">
                    oleh {actorName ?? actorEmail ?? "pengurus"} · {summarizeAuditChange(log.action, log.beforeJson, log.afterJson)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </CollapsibleSection>
    </div>
  );
}
