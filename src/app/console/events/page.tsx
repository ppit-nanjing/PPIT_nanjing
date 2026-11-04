import type { Metadata } from "next";
import { sql, inArray, eq, and, asc, desc, isNull, isNotNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { departments, events, eventCommittee, eventRegistrations, users } from "@/db/schema";
import { restoreEvent, deleteEventPermanently } from "@/app/actions/admin-events";
import { publishDueEvents } from "@/lib/publish-events";
import { hasModuleAccess } from "@/lib/admin-scope";
import { getScopedEventIds } from "@/lib/event-access";
import { eventCountdownLabel, eventDayLabel, eventStage, eventStatusChip, eventTimeLabel } from "@/lib/event-stage";
import { EVENT_STATUS_LABEL as STATUS_LABEL } from "@/lib/event-status-labels";
import { CollapsibleSection } from "@/components/console/collapsible-section";
import { GuideButton } from "@/components/console/guide-button";
import { getGuide } from "@/lib/guides";
import { EventCreateForm } from "@/components/console/event-create-form";
import { ConfirmButton } from "@/components/console/confirm-button";
import { EventsBoard, type BoardEvent, type EventBoardGroup } from "@/components/console/events-board";
import { EventsPageHeader } from "@/components/console/events-page-header";

// Diurutkan seperti cara orang membacanya: yang terdekat lebih dulu; yang belum
// punya tanggal di ujung; kegiatan lampau dari yang paling baru.
function byStartAscending(a: { startAt: Date | null }, b: { startAt: Date | null }) {
  if (!a.startAt) return b.startAt ? 1 : 0;
  if (!b.startAt) return -1;
  return a.startAt.getTime() - b.startAt.getTime();
}

export const metadata: Metadata = { title: "Kegiatan" };

export default async function ConsoleEventsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  // Full admin (BPH Kabinet + Divisi Teknologi): semua acara.
  // Pemegang modul "events" non-full: boleh MEMBUAT acara, dan hanya melihat
  // acara yang dia buat ∪ divisinya jadi Divisi Penanggung Jawab ∪ acara tempat
  // dia panitia (scope per-acara; lihat getScopedEventIds/getEventAccess).
  // Panitia tanpa modul: hanya acara yang dia ikuti, tanpa tombol buat/hapus.
  // Hapus (ke Sampah), pulihkan, hapus permanen: full admin saja.
  const isFullAdmin = session.user.adminScope === "full";
  const canManageEvents = hasModuleAccess(session.user.adminScope ?? null, "events");

  // Acara di Sampah tidak dihitung: pemegang modul mengelolanya dari bagian Sampah.
  // Query ini tidak diperlukan untuk full admin (daftarnya semua acara).
  const committeeRows = isFullAdmin
    ? []
    : await db
        .select({ eventId: eventCommittee.eventId })
        .from(eventCommittee)
        .innerJoin(events, eq(events.id, eventCommittee.eventId))
        .where(and(eq(eventCommittee.userId, session.user.id), isNull(events.deletedAt)));
  const committeeEventIds = [...new Set(committeeRows.map((r) => r.eventId))];

  if (!canManageEvents && committeeEventIds.length === 0) redirect("/console?akses=events");

  const scopedIds = isFullAdmin || !canManageEvents ? [] : (await getScopedEventIds()) ?? [];
  // Full admin = semua; pemegang modul = acara hasil scope (buat ∪ divisi PJ ∪
  // kepanitiaan); panitia tanpa modul = acara kepanitiaannya saja.
  const visibleEventIds: string[] | null = isFullAdmin ? null : canManageEvents ? scopedIds : committeeEventIds;
  const scopedIdSet = new Set(scopedIds);

  // Kept sequential on purpose: the list below must reflect events this
  // publish just flipped to 'published'. The independent reads then run
  // concurrently in one batch.
  if (canManageEvents) await publishDueEvents();
  const [list, trash, departmentOptions, guide, seatRows] = await Promise.all([
    // Postgres DESC default = NULLS FIRST, which would float unscheduled
    // ("Belum dijadwalkan") events above everything - pin them to the bottom.
    // Acara di Sampah tidak ikut daftar utama (lihat bagian Sampah di bawah).
    isFullAdmin
      ? db.select().from(events).where(isNull(events.deletedAt)).orderBy(sql`${events.startAt} desc nulls last`)
      : visibleEventIds && visibleEventIds.length > 0
        ? db
            .select()
            .from(events)
            .where(and(inArray(events.id, visibleEventIds), isNull(events.deletedAt)))
            .orderBy(sql`${events.startAt} desc nulls last`)
        : Promise.resolve([] as (typeof events.$inferSelect)[]),
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
      : Promise.resolve([] as { id: string; title: string; status: (typeof events.$inferSelect)["status"]; startAt: Date | null; deletedAt: Date | null; deletedByName: string | null }[]),
    // Pilihan Divisi Penanggung Jawab di form buat acara — hanya dirender untuk
    // yang boleh membuat acara.
    canManageEvents
      ? db
          .select({ id: departments.id, name: departments.name, parentId: departments.parentDepartmentId })
          .from(departments)
          .orderBy(asc(departments.orderIndex))
      : Promise.resolve([] as { id: string; name: string; parentId: string | null }[]),
    getGuide("kegiatan"),
    // Jumlah kursi per acara, hanya untuk acara yang boleh dilihat akun ini.
    // Aturan "terdaftar" sama dengan getEventSeats(): semua kecuali yang dibatalkan.
    isFullAdmin || (visibleEventIds && visibleEventIds.length > 0)
      ? db
          .select({
            eventId: eventRegistrations.eventId,
            registered: sql<number>`count(*) filter (where ${eventRegistrations.status} <> 'cancelled')::int`,
            attended: sql<number>`count(*) filter (where ${eventRegistrations.status} = 'attended')::int`,
          })
          .from(eventRegistrations)
          .where(visibleEventIds ? inArray(eventRegistrations.eventId, visibleEventIds) : undefined)
          .groupBy(eventRegistrations.eventId)
      : Promise.resolve([] as { eventId: string; registered: number; attended: number }[]),
  ]);
  const formatDateTime = (d: Date) =>
    new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Shanghai" }).format(d);

  const seatsByEvent = new Map(seatRows.map((row) => [row.eventId, row]));
  const now = new Date();
  const groupOf = (e: (typeof list)[number]): EventBoardGroup => {
    const stage = eventStage(e, now);
    if (stage === "persiapan") return "disiapkan";
    return stage === "tayang" || stage === "berlangsung" ? "datang" : "selesai";
  };
  const upcoming = list.filter((e) => groupOf(e) === "datang").sort(byStartAscending);
  const preparing = list.filter((e) => groupOf(e) === "disiapkan").sort(byStartAscending);
  // `list` sudah urut tanggal terbaru dulu dari query di atas.
  const past = list.filter((e) => groupOf(e) === "selesai");

  const boardEvents: BoardEvent[] = [...upcoming, ...preparing, ...past].map((e) => {
    const stage = eventStage(e, now);
    const chip = eventStatusChip(e.status, stage);
    const seats = seatsByEvent.get(e.id);
    return {
      id: e.id,
      slug: e.slug,
      title: e.title,
      coverImageUrl: e.coverImageUrl,
      category: e.category,
      location: e.location,
      description: e.id === upcoming[0]?.id ? e.description?.slice(0, 280) ?? null : null,
      group: groupOf(e),
      chipLabel: chip.label,
      chipTone: chip.tone,
      dayLabel: e.startAt ? eventDayLabel(e.startAt) : null,
      timeLabel: e.startAt ? eventTimeLabel(e.startAt) : null,
      countdownLabel:
        stage === "berlangsung" ? "Sedang berlangsung" : stage === "tayang" && e.startAt ? eventCountdownLabel(e.startAt, now) : null,
      scheduledLabel: e.scheduledPublishAt ? `Rilis ${eventDayLabel(e.scheduledPublishAt)}` : null,
      registered: seats?.registered ?? 0,
      attended: seats?.attended ?? 0,
      capacity: e.capacity,
      finalAttendeeCount: e.finalAttendeeCount,
      isDraft: e.status === "draft",
      isPublic: e.status === "published" || e.status === "registration_closed" || e.status === "completed",
      // Sama dengan aturan lama: menarik ke draf butuh modul + acara dalam cakupan;
      // hapus (ke Sampah) khusus full admin. Server action tetap memeriksa sendiri.
      canMoveToDraft: canManageEvents && (isFullAdmin || scopedIdSet.has(e.id)),
      canDelete: isFullAdmin,
    };
  });

  return (
    <div className="px-3 py-4 sm:px-6 lg:px-8 lg:py-10">
      <EventsPageHeader
        title={canManageEvents ? "Manajemen Kegiatan" : "Acara Kepanitiaan Saya"}
        // Hanya pemegang modul terbatas yang perlu tahu mengapa daftarnya tidak lengkap.
        subline={canManageEvents && !isFullAdmin ? "Acara yang kamu buat, divisimu tangani, atau kamu ikuti sebagai panitia." : undefined}
        guide={guide ? <GuideButton title={guide.title} content={guide.content} docSlug="kegiatan" /> : null}
      >
        {canManageEvents ? <EventCreateForm departments={departmentOptions} /> : null}
      </EventsPageHeader>

      <EventsBoard
        events={boardEvents}
        emptyText={canManageEvents ? "Belum ada kegiatan. Mulai dari tombol Buat Kegiatan." : "Kamu belum ditugaskan di acara mana pun."}
      />

      {isFullAdmin && (
        <div className="mt-6 sm:mt-8">
          <CollapsibleSection
            title={`Sampah${trash.length > 0 ? ` (${trash.length})` : ""}`}
            description="Tidak tampil di situs dan tidak bisa dibuka panitia. Datanya utuh dan statusnya kembali saat dipulihkan."
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
