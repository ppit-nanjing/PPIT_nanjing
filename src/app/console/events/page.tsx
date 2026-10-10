import { sql, inArray, eq, and, desc, isNull, isNotNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { events, eventCommittee, users } from "@/db/schema";
import { setEventStatus, restoreEvent, deleteEventPermanently } from "@/app/actions/admin-events";
import { publishDueEvents } from "@/lib/publish-events";
import { DeleteEventButton } from "@/components/console/delete-event-button";
import { hasModuleAccess } from "@/lib/admin-scope";
import { EVENT_STATUS_LABEL as STATUS_LABEL } from "@/lib/event-status-labels";
import { CollapsibleSection } from "@/components/console/collapsible-section";
import { GuideButton } from "@/components/console/guide-button";
import { getGuide } from "@/lib/guides";
import { Plus } from "lucide-react";
import Link from "next/link";
import { EventCreateForm } from "@/components/console/event-create-form";
import { ConfirmButton } from "@/components/console/confirm-button";

export default async function ConsoleEventsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  // Admin modul "events" -> semua acara + bisa buat/hapus. Kalau tidak, panitia:
  // hanya acara yang dia ikuti, tanpa tombol buat/hapus.
  const isEventsAdmin = hasModuleAccess(session.user.adminScope ?? null, "events");
  // Hapus (pindah ke Sampah), pulihkan, dan hapus permanen: BPH "full" saja —
  // sama dengan kapabilitas event.delete. Admin modul lain tidak melihat tombolnya.
  const isFullAdmin = session.user.adminScope === "full";
  let committeeEventIds: string[] = [];
  if (!isEventsAdmin) {
    const rows = await db
      .select({ eventId: eventCommittee.eventId })
      .from(eventCommittee)
      .where(eq(eventCommittee.userId, session.user.id));
    committeeEventIds = [...new Set(rows.map((r) => r.eventId))];
    if (committeeEventIds.length === 0) redirect("/console");
  }

  // Kept sequential on purpose: the list below must reflect events this
  // publish just flipped to 'published'. The independent reads then run
  // concurrently in one batch.
  if (isEventsAdmin) await publishDueEvents();
  const [list, trash, guide] = await Promise.all([
    // Postgres DESC default = NULLS FIRST, which would float unscheduled
    // ("Belum dijadwalkan") events above everything - pin them to the bottom.
    // Acara di Sampah tidak ikut daftar utama (lihat bagian Sampah di bawah).
    isEventsAdmin
      ? db.select().from(events).where(isNull(events.deletedAt)).orderBy(sql`${events.startAt} desc nulls last`)
      : db
          .select()
          .from(events)
          .where(and(inArray(events.id, committeeEventIds), isNull(events.deletedAt)))
          .orderBy(sql`${events.startAt} desc nulls last`),
    isFullAdmin
      ? db
          .select({
            id: events.id,
            title: events.title,
            status: events.status,
            startAt: events.startAt,
            deletedAt: events.deletedAt,
            deletedByName: users.name,
          })
          .from(events)
          .leftJoin(users, eq(events.deletedBy, users.id))
          .where(isNotNull(events.deletedAt))
          .orderBy(desc(events.deletedAt))
      : Promise.resolve([]),
    getGuide("kegiatan"),
  ]);
  const formatDateTime = (d: Date) =>
    new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Shanghai" }).format(d);

  return (
    <div className="px-3 py-4 sm:px-6 lg:px-8 lg:py-10">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4 sm:mb-6 lg:mb-8">
        <h1 className="text-headline-md sm:text-headline-lg text-on-background">
          {isEventsAdmin ? "Manajemen Kegiatan" : "Acara Kepanitiaan Saya"}
        </h1>
        {guide && <GuideButton title={guide.title} content={guide.content} docSlug="kegiatan" />}
      </div>

      {isEventsAdmin && (
        <details className="mb-6 sm:mb-8 bg-surface-container-lowest border border-outline-variant rounded-xl">
          <summary className="flex items-center gap-2 px-4 py-3 sm:px-6 sm:py-4 cursor-pointer text-label-caps text-primary-container uppercase tracking-wide">
            <Plus size={16} /> Buat Kegiatan Baru
          </summary>
          <EventCreateForm />
        </details>
      )}

      <CollapsibleSection
        title="Daftar Kegiatan"
        description={isEventsAdmin ? "Semua kegiatan yang dibuat." : "Acara yang kamu ikuti sebagai panitia."}
      >
        <div className="flex flex-col gap-2">
          {list.length === 0 && (
            <p className="text-body-md text-on-surface-variant">
              {isEventsAdmin ? "Belum ada kegiatan dibuat." : "Kamu belum ditugaskan di acara mana pun."}
            </p>
          )}
          {list.map((e) => (
            <div
              key={e.id}
              className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between bg-surface-container-lowest border border-outline-variant rounded-lg pl-4 pr-2 py-2 hover:bg-surface-container-low transition-colors"
            >
              <Link
                href={`/console/events/${e.id}`}
                className="w-full sm:flex-1 sm:min-w-0 flex items-center justify-between gap-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-body-md font-medium text-on-background truncate">{e.title}</p>
                  <p className="text-label-caps text-on-surface-variant">
                    {e.startAt ? new Date(e.startAt).toLocaleDateString("id-ID") : "Belum dijadwalkan"}
                  </p>
                </div>
                <span className="text-label-caps uppercase tracking-wide bg-surface-container-low px-2.5 py-1 rounded shrink-0">
                  {STATUS_LABEL[e.status]}
                </span>
              </Link>
              {isEventsAdmin && (
                <div className="self-end sm:self-auto flex items-center gap-2 sm:shrink-0">
                   {e.status !== "draft" && (
                     // Unpublishing a live event is user-visible - confirm first.
                     <ConfirmButton
                       title="Jadikan draft?"
                       message={`"${e.title}" akan langsung disembunyikan dari publik.`}
                       confirmLabel="Ya, jadikan draft"
                       action={setEventStatus}
                       payload={{ eventId: e.id, status: "draft" }}
                       danger={false}
                       className="text-label-caps uppercase tracking-wide px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-md border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-colors"
                     >
                       Jadikan Draft
                     </ConfirmButton>
                   )}
                  {isFullAdmin && <DeleteEventButton eventId={e.id} />}
                </div>
              )}
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {isFullAdmin && (
        <div className="mt-6 sm:mt-8">
          <CollapsibleSection
            title={`Sampah${trash.length > 0 ? ` (${trash.length})` : ""}`}
            description="Kegiatan yang dihapus. Tidak tampil di situs dan tidak bisa dibuka panitia, tapi datanya utuh. Pulihkan untuk mengembalikannya dengan status semula."
            defaultOpen={false}
          >
            <div className="flex flex-col gap-2">
              {trash.length === 0 && <p className="text-body-md text-on-surface-variant">Sampah kosong.</p>}
              {trash.map((e) => (
                <div
                  key={e.id}
                  className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-body-md font-medium text-on-background truncate">{e.title}</p>
                    <p className="text-body-sm text-on-surface-variant">
                      Dihapus {e.deletedAt ? formatDateTime(new Date(e.deletedAt)) : ""}
                      {e.deletedByName ? ` oleh ${e.deletedByName}` : ""} · status semula {STATUS_LABEL[e.status]}
                    </p>
                  </div>
                  <div className="self-end sm:self-auto flex items-center gap-2 sm:shrink-0">
                    <ConfirmButton
                      title="Pulihkan kegiatan?"
                      message={
                        e.status === "draft"
                          ? `"${e.title}" kembali ke Daftar Kegiatan sebagai draft.`
                          : `"${e.title}" kembali ke Daftar Kegiatan dengan status ${STATUS_LABEL[e.status]} — langsung tampil lagi di situs publik bila statusnya publik.`
                      }
                      confirmLabel="Ya, pulihkan"
                      action={restoreEvent}
                      payload={{ eventId: e.id }}
                      danger={false}
                      successMessage="Kegiatan dipulihkan."
                      className="text-label-caps uppercase tracking-wide px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-md border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-colors"
                    >
                      Pulihkan
                    </ConfirmButton>
                    <ConfirmButton
                      title="Hapus permanen?"
                      message={`"${e.title}" beserta semua pendaftar, panitia, evaluasi, dan datanya dihapus selamanya. Tindakan ini TIDAK bisa dibatalkan.`}
                      confirmLabel="Ya, hapus permanen"
                      action={deleteEventPermanently}
                      payload={{ eventId: e.id }}
                      successMessage="Kegiatan dihapus permanen."
                      className="text-label-caps uppercase tracking-wide text-error hover:opacity-80 px-3 py-2 rounded-md hover:bg-error-container/30 transition-colors"
                    >
                      Hapus Permanen
                    </ConfirmButton>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        </div>
      )}
    </div>
  );
}
