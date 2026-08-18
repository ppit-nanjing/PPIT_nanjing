import { eq } from "drizzle-orm";
import { BellRing } from "lucide-react";
import { db } from "@/db";
import { notificationTemplates, users } from "@/db/schema";
import { requireModuleAccess } from "@/lib/admin-scope";
import { NOTIFICATION_TEMPLATES } from "@/lib/notification-templates";
import { NotificationTemplateEditor } from "@/components/console/notification-template-editor";

export default async function ConsoleNotificationsPage() {
  await requireModuleAccess("notifications");

  const rows = await db
    .select({
      key: notificationTemplates.key,
      subject: notificationTemplates.subject,
      bodyTemplate: notificationTemplates.bodyTemplate,
      updatedAt: notificationTemplates.updatedAt,
      updatedByName: users.name,
    })
    .from(notificationTemplates)
    .leftJoin(users, eq(notificationTemplates.updatedBy, users.id));

  const byKey = new Map(rows.map((r) => [r.key, r]));

  // Group headings come from the registry order, so the page always mirrors the
  // notifications that actually exist in code.
  const groups = NOTIFICATION_TEMPLATES.reduce<Record<string, typeof NOTIFICATION_TEMPLATES>>(
    (acc, def) => {
      (acc[def.group] ??= []).push(def);
      return acc;
    },
    {},
  );

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="mb-6 l:mb-8">
        <h1 className="text-headline-md sm:text-headline-lg text-on-background mb-2">
          Template Notifikasi
        </h1>
        <p className="text-body-md text-on-surface-variant max-w-2xl">
          Ubah kata-kata notifikasi otomatis yang diterima anggota. Setiap template di bawah ini
          benar-benar terpakai di aplikasi — tidak ada template yang tidak pernah terkirim. Template
          yang belum pernah diubah memakai teks bawaan.
        </p>
      </div>

      <div className="bg-surface-container-low border border-outline-variant rounded-lg p-4 mb-8 flex items-start gap-3 max-w-2xl">
        <BellRing size={18} className="text-on-surface-variant shrink-0 mt-0.5" aria-hidden />
        <p className="text-body-sm text-on-surface-variant">
          Semua notifikasi ini dikirim <strong className="text-on-background">di dalam aplikasi</strong>{" "}
          (lonceng di navigasi dan halaman Notifikasi). Pengiriman lewat email atau push belum
          tersedia karena belum ada penyedia pengiriman yang terpasang.
        </p>
      </div>

      <div className="flex flex-col gap-8 max-w-3xl">
        {Object.entries(groups).map(([group, defs]) => (
          <section key={group} className="flex flex-col gap-3">
            <h2 className="text-label-caps uppercase tracking-wide text-on-surface-variant">
              {group}
            </h2>
            {defs.map((def) => {
              const row = byKey.get(def.key);
              return (
                <NotificationTemplateEditor
                  key={def.key}
                  def={def}
                  subject={row?.subject?.trim() || def.defaultSubject}
                  bodyTemplate={row?.bodyTemplate?.trim() || def.defaultBody}
                  customized={Boolean(row)}
                  updatedAt={
                    row?.updatedAt
                      ? new Date(row.updatedAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : null
                  }
                  updatedByName={row?.updatedByName ?? null}
                />
              );
            })}
          </section>
        ))}
      </div>
    </div>
  );
}
