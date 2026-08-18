import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { inventoryAuditLogs, inventoryItems, users } from "@/db/schema";
import { requireModuleAccess } from "@/lib/admin-scope";
import { CollapsibleSection } from "@/components/console/collapsible-section";

const ACTION_LABEL: Record<string, string> = {
  added: "Ditambahkan",
  adjusted: "Disesuaikan",
  damaged: "Rusak",
  retired: "Dipensiunkan",
  lent_external: "Dipinjam Keluar",
  returned_external: "Dikembalikan (Eksternal)",
};

export default async function InventoryAuditLogPage() {
  await requireModuleAccess("inventory");

  const logs = await db
    .select({ log: inventoryAuditLogs, itemName: inventoryItems.name, actorName: users.name, actorEmail: users.email })
    .from(inventoryAuditLogs)
    .leftJoin(inventoryItems, eq(inventoryAuditLogs.itemId, inventoryItems.id))
    .leftJoin(users, eq(inventoryAuditLogs.performedBy, users.id))
    .orderBy(desc(inventoryAuditLogs.createdAt))
    .limit(100);

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <h1 className="text-headline-md sm:text-headline-lg text-on-background mb-2">Log Audit Inventaris</h1>
      <p className="text-body-md text-on-surface-variant mb-8">
        Riwayat perubahan stok dan kondisi barang &mdash; siapa mengubah apa, kapan.
      </p>

      <CollapsibleSection title="Riwayat Perubahan" description="Perubahan stok dan kondisi barang.">
        <div className="hidden sm:block bg-surface-container-lowest border border-outline-variant rounded-xl overflow-x-auto">
          <table className="w-full text-body-md min-w-[640px]">
            <thead className="bg-surface-container-low text-label-caps uppercase tracking-wide text-on-surface-variant">
              <tr>
                <th className="text-left px-5 py-3">Barang</th>
                <th className="text-left px-5 py-3">Aksi</th>
                <th className="text-left px-5 py-3">Perubahan Jumlah</th>
                <th className="text-left px-5 py-3">Oleh</th>
                <th className="text-left px-5 py-3">Waktu</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-on-surface-variant">
                    Belum ada perubahan tercatat.
                  </td>
                </tr>
              )}
              {logs.map(({ log, itemName, actorName, actorEmail }) => (
                <tr key={log.id} className="border-t border-outline-variant">
                  <td className="px-5 py-3 font-medium text-on-background">{itemName ?? "(barang dihapus)"}</td>
                  <td className="px-5 py-3">
                    <span className="text-label-caps uppercase tracking-wide bg-surface-container-low px-2 py-1 rounded">
                      {ACTION_LABEL[log.action] ?? log.action}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {log.quantityDelta > 0 ? "+" : ""}
                    {log.quantityDelta}
                  </td>
                  <td className="px-5 py-3 text-label-caps text-on-surface-variant">{actorName ?? actorEmail ?? "Sistem"}</td>
                  <td className="px-5 py-3 text-label-caps text-on-surface-variant">
                    {new Date(log.createdAt).toLocaleString("id-ID")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="sm:hidden flex flex-col gap-3">
          {logs.length === 0 ? (
            <p className="text-body-md text-on-surface-variant">Belum ada perubahan tercatat.</p>
          ) : (
            logs.map(({ log, itemName, actorName, actorEmail }) => (
              <div key={log.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-on-background truncate">{itemName ?? "(barang dihapus)"}</p>
                  <span className="text-label-caps uppercase tracking-wide bg-surface-container-low px-2 py-1 rounded shrink-0">
                    {ACTION_LABEL[log.action] ?? log.action}
                  </span>
                </div>
                <div className="flex items-center justify-between text-body-md">
                  <span className="text-label-caps text-on-surface-variant">Perubahan</span>
                  <span className="text-on-background">
                    {log.quantityDelta > 0 ? "+" : ""}
                    {log.quantityDelta}
                  </span>
                </div>
                <p className="text-body-md">
                  <span className="text-label-caps text-on-surface-variant">Oleh: </span>
                  <span className="text-on-surface-variant">{actorName ?? actorEmail ?? "Sistem"}</span>
                </p>
                <p className="text-label-caps text-on-surface-variant">
                  {new Date(log.createdAt).toLocaleString("id-ID")}
                </p>
              </div>
            ))
          )}
        </div>
      </CollapsibleSection>
    </div>
  );
}
