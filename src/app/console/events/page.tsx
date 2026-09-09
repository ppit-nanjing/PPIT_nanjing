import { sql, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { events, eventCommittee } from "@/db/schema";
import { setEventStatus } from "@/app/actions/admin-events";
import { publishDueEvents } from "@/lib/publish-events";
import { DeleteEventButton } from "@/components/console/delete-event-button";
import { hasModuleAccess } from "@/lib/admin-scope";
import { CollapsibleSection } from "@/components/console/collapsible-section";
import { GuideButton } from "@/components/console/guide-button";
import { getGuide } from "@/lib/guides";
import { Plus } from "lucide-react";
import Link from "next/link";
import { EventCreateForm } from "@/components/console/event-create-form";
import { ConfirmButton } from "@/components/console/confirm-button";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draf",
  scheduled: "Terjadwal (belum rilis)",
  published: "Dipublikasikan",
  registration_closed: "Pendaftaran Ditutup",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

export default async function ConsoleEventsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  // Admin modul "events" -> semua acara + bisa buat/hapus. Kalau tidak, panitia:
  // hanya acara yang dia ikuti, tanpa tombol buat/hapus.
  const isEventsAdmin = hasModuleAccess(session.user.adminScope ?? null, "events");
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
  const [list, guide] = await Promise.all([
    // Postgres DESC default = NULLS FIRST, which would float unscheduled
    // ("Belum dijadwalkan") events above everything - pin them to the bottom.
    isEventsAdmin
      ? db.select().from(events).orderBy(sql`${events.startAt} desc nulls last`)
      : db
          .select()
          .from(events)
          .where(inArray(events.id, committeeEventIds))
          .orderBy(sql`${events.startAt} desc nulls last`),
    getGuide("kegiatan"),
  ]);

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
                  <DeleteEventButton eventId={e.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      </CollapsibleSection>
    </div>
  );
}
