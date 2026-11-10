import type { Metadata } from "next";
import type { ReactNode } from "react";
import { and, desc, eq, inArray, isNull, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  borrowRequests,
  departmentMembers,
  eventRegistrations,
  departments,
  events,
  feedback,
  inventoryItems,
  jobPostings,
  membershipApplications,
  newsArticles,
  users,
} from "@/db/schema";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { CalendarDays, MessageSquare, Package, UserCheck, UserPlus } from "lucide-react";
import { auth } from "@/auth";
import { GuideButton } from "@/components/console/guide-button";
import { StartHere } from "@/components/console/start-here";
import {
  AttentionList,
  DashboardCard,
  DivisionBars,
  EventAgenda,
  FactRows,
  RatioMeter,
  ShortList,
  dashboardSpans,
  type AgendaEvent,
  type AttentionItem,
} from "@/components/console/dashboard-cards";
import { START_HIDDEN_COOKIE, buildStartGuide } from "@/lib/console-start";
import { moduleLabel } from "@/lib/console-nav";
import { hasModuleAccess, type AdminModule } from "@/lib/admin-scope";
import { getPersonalEventIds, getScopedEventIds } from "@/lib/event-access";
import { eventCountdownLabel, eventDayLabel, eventStage, eventTimeLabel } from "@/lib/event-stage";
import { getGuide } from "@/lib/guides";

// /console admits any admin, cabinet coordinator, event committee member or cabinet
// member who may draft events, so the layout says nothing about WHICH modules this
// viewer holds. Every card, number and list row on this page belongs to exactly one
// module below and is only queried and rendered for a viewer who holds it (AGENTS.md:
// each surface enforces its own module). Aliases (content/gallery) are resolved by
// hasModuleAccess(); "sensus" is the full census module, not "sensus-verify".
const DASHBOARD_MODULES = [
  "users",
  "organization",
  "sensus",
  "events",
  "content",
  "career",
  "membership",
  "inventory",
  "feedback",
] as const satisfies readonly AdminModule[];
type DashboardModule = (typeof DASHBOARD_MODULES)[number];
type DashboardAccess = Record<DashboardModule, boolean>;

// One group per module; a group is absent (undefined) when the viewer doesn't
// hold that module, and the rendering below keys off that presence instead of
// repeating the access check.
type DashboardCounts = {
  users?: { total: number; active: number; newThisMonth: number; invited: number; inactive: number };
  organization?: { members: number };
  sensus?: { complete: number; started: number; members: number };
  events?: {
    // Bagi full admin hanya yang sudah disetujui: draf percobaan pengurus lain bukan
    // pekerjaan BPH sampai diajukan.
    draft: number;
    // Menunggu keputusan BPH Kabinet. Selalu 0 selain untuk full admin.
    awaitingApproval: number;
    pendingRegs: number;
    regsThisWeek: number;
    regsLastWeek: number;
  };
  content?: { publishedNews: number; draftNews: number; albums: number; photos: number };
  career?: { openJobs: number; applications: number };
  membership?: { pending: number; recruitOpen: boolean };
  inventory?: {
    items: number;
    unitsTotal: number;
    unitsAvailable: number;
    pendingBorrow: number;
    overdueBorrow: number;
    pendingContrib: number;
    pendingProcure: number;
  };
  feedback?: { total: number; unread: number };
};

// Perf: this used to fire 26 separate COUNT(*) queries through Promise.all -
// one HTTPS round trip each to the Neon ap-southeast-1 proxy. They are fused into
// ONE select of scalar subqueries (single round trip), and the whole batch in the
// page runs concurrently with the card lists and the guide. Only the subqueries of
// modules the viewer holds go into that select; with none of them there is no
// query at all.
//
// eventIds: null = every event (full admin). Otherwise the events this viewer can
// actually open, the same boundary /console/events applies to a scoped "events"
// holder (getScopedEventIds) - the module alone does not grant other divisions'
// events or their registrants.
async function fetchDashboardCounts(
  access: DashboardAccess,
  startOfMonth: Date,
  eventIds: string[] | null,
): Promise<DashboardCounts> {
  const cols: SQL[] = [];

  if (access.users) {
    cols.push(
      sql`(select count(*) from users)::int as "usersTotal"`,
      sql`(select count(*) from users where status = 'active')::int as "usersActive"`,
      sql`(select count(*) from users where created_at >= ${startOfMonth})::int as "usersNew"`,
      sql`(select count(*) from users where status = 'invited')::int as "usersInvited"`,
      sql`(select count(*) from users where status in ('inactive', 'suspended'))::int as "usersInactive"`,
    );
  }
  if (access.organization) {
    cols.push(sql`(select count(distinct user_id) from department_members)::int as "orgMembers"`);
  }
  if (access.sensus) {
    cols.push(
      sql`(select count(*) from sensus_profiles where completion_status = 'complete')::int as "sensusComplete"`,
      sql`(select count(*) from sensus_profiles)::int as "sensusStarted"`,
      // Own denominator, so a census-only viewer doesn't depend on the users module's count.
      sql`(select count(*) from users)::int as "sensusMembers"`,
    );
  }
  if (access.events) {
    const ownEvents = eventIds === null ? sql`true` : inArray(events.id, eventIds);
    const ownRegs = eventIds === null ? sql`true` : inArray(eventRegistrations.eventId, eventIds);
    cols.push(
      sql`(select count(*) from events where status = 'draft' and deleted_at is null and ${eventIds === null ? sql`approved_at is not null` : ownEvents})::int as "eventsDraft"`,
      eventIds === null
        ? sql`(select count(*) from events where status = 'draft' and approval_requested_at is not null and approved_at is null and deleted_at is null)::int as "eventsAwaitingApproval"`
        : sql`0 as "eventsAwaitingApproval"`,
      sql`(select count(*) from event_registrations where status = 'pending' and ${ownRegs})::int as "regsPending"`,
      // Week-over-week (Mon-based weeks): this week against the one before, both named
      // on the card so neither number reads as the other's baseline.
      sql`(select count(*) from event_registrations where registered_at >= date_trunc('week', now()) and ${ownRegs})::int as "regsThisWeek"`,
      sql`(select count(*) from event_registrations where registered_at >= date_trunc('week', now()) - interval '7 days' and registered_at < date_trunc('week', now()) and ${ownRegs})::int as "regsLastWeek"`,
    );
  }
  if (access.content) {
    cols.push(
      sql`(select count(*) from news_articles where status = 'published')::int as "newsPublished"`,
      sql`(select count(*) from news_articles where status = 'draft')::int as "newsDraft"`,
      sql`(select count(*) from gallery_albums)::int as "albums"`,
      sql`(select count(*) from gallery_photos)::int as "photos"`,
    );
  }
  if (access.career) {
    cols.push(
      sql`(select count(*) from job_postings where status = 'open')::int as "jobsOpen"`,
      sql`(select count(*) from job_applications)::int as "jobApplications"`,
    );
  }
  if (access.membership) {
    cols.push(
      sql`(select count(*) from membership_applications where status = 'pending')::int as "membersPending"`,
      sql`(select count(*) from recruitment_periods where is_open)::int as "recruitOpenPeriods"`,
    );
  }
  if (access.inventory) {
    cols.push(
      sql`(select count(*) from inventory_items)::int as "inventoryItems"`,
      sql`(select coalesce(sum(total_quantity), 0) from inventory_items)::int as "unitsTotal"`,
      sql`(select coalesce(sum(available_quantity), 0) from inventory_items)::int as "unitsAvailable"`,
      sql`(select count(*) from borrow_requests where status = 'pending')::int as "borrowPending"`,
      sql`(select count(*) from borrow_requests where status = 'overdue')::int as "borrowOverdue"`,
      sql`(select count(*) from item_contributions where status = 'pending')::int as "contribPending"`,
      sql`(select count(*) from procurement_requests where status = 'pending')::int as "procurePending"`,
    );
  }
  if (access.feedback) {
    cols.push(
      sql`(select count(*) from feedback)::int as "feedbackTotal"`,
      sql`(select count(*) from feedback where status = 'new')::int as "feedbackNew"`,
    );
  }

  if (cols.length === 0) return {};
  const {
    rows: [r],
  } = await db.execute<Record<string, number>>(sql`select ${sql.join(cols, sql`, `)}`);

  return {
    users: access.users
      ? { total: r.usersTotal, active: r.usersActive, newThisMonth: r.usersNew, invited: r.usersInvited, inactive: r.usersInactive }
      : undefined,
    organization: access.organization ? { members: r.orgMembers } : undefined,
    sensus: access.sensus ? { complete: r.sensusComplete, started: r.sensusStarted, members: r.sensusMembers } : undefined,
    events: access.events
      ? {
          draft: r.eventsDraft,
          awaitingApproval: r.eventsAwaitingApproval,
          pendingRegs: r.regsPending,
          regsThisWeek: r.regsThisWeek,
          regsLastWeek: r.regsLastWeek,
        }
      : undefined,
    content: access.content
      ? { publishedNews: r.newsPublished, draftNews: r.newsDraft, albums: r.albums, photos: r.photos }
      : undefined,
    career: access.career ? { openJobs: r.jobsOpen, applications: r.jobApplications } : undefined,
    membership: access.membership ? { pending: r.membersPending, recruitOpen: r.recruitOpenPeriods > 0 } : undefined,
    inventory: access.inventory
      ? {
          items: r.inventoryItems,
          unitsTotal: r.unitsTotal,
          unitsAvailable: r.unitsAvailable,
          pendingBorrow: r.borrowPending,
          overdueBorrow: r.borrowOverdue,
          pendingContrib: r.contribPending,
          pendingProcure: r.procurePending,
        }
      : undefined,
    feedback: access.feedback ? { total: r.feedbackTotal, unread: r.feedbackNew } : undefined,
  };
}

// Runs `run` only when the viewer may see the card: the query is not even built otherwise.
function whenAllowed<T>(allowed: boolean, run: () => PromiseLike<T[]>): Promise<T[]> {
  return allowed ? Promise.resolve(run()) : Promise.resolve([]);
}

function timeAgo(d: Date) {
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return "baru saja";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} mnt lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} jam lalu`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} hari lalu`;
  return eventDayLabel(d);
}

const APPLICATION_STATUS: Record<string, string> = {
  pending: "Menunggu",
  reviewed: "Ditinjau",
  accepted: "Diterima",
  rejected: "Ditolak",
};

const FEEDBACK_CATEGORY: Record<string, string> = {
  bug: "Laporan masalah",
  design: "Tampilan",
  feature: "Usulan fitur",
  general: "Umum",
};

// Urutan pohon Organisasi: departemen menurut urutannya, divisinya tepat di bawahnya.
function inTreeOrder<T extends { id: string; parentId: string | null; orderIndex: number }>(rows: T[]): T[] {
  const byOrder = (a: T, b: T) => a.orderIndex - b.orderIndex;
  const children = (parentId: string) => rows.filter((r) => r.parentId === parentId).sort(byOrder);
  return rows
    .filter((r) => !r.parentId || !rows.some((p) => p.id === r.parentId))
    .sort(byOrder)
    .flatMap((top) => [top, ...children(top.id)]);
}

export const metadata: Metadata = { title: "Dashboard" };

export default async function ConsoleDashboardPage({ searchParams }: { searchParams: Promise<{ akses?: string }> }) {
  const { akses } = await searchParams;
  const blockedModule = moduleLabel(akses);
  const blockedFeature = akses === "fitur";
  const session = await auth();
  if (!session) redirect("/login");
  const scope = session.user.adminScope ?? null;

  // A ranting board member's only surface is their own-campus census summary -
  // the org-wide dashboard below would just be noise (and shows counts they have
  // no other page to act on). Send them straight there.
  if (Array.isArray(scope) && scope.length === 1 && scope[0] === "sensus-ranting") {
    redirect("/console/ranting/sensus");
  }

  const access = Object.fromEntries(
    DASHBOARD_MODULES.map((m) => [m, hasModuleAccess(scope, m)]),
  ) as DashboardAccess;
  const holdsAnyModule = DASHBOARD_MODULES.some((m) => access[m]);

  // Kegiatan: pemegang modul melihat acara dalam cakupannya (null = semua); pengurus dan
  // panitia tanpa modul melihat "Kegiatan Saya" (acara yang dia buat atau ikuti).
  const showsOwnEvents = !access.events && (session.user.isCommittee || session.user.canCreateEvent);
  const agendaIds: string[] | null | undefined = access.events
    ? await getScopedEventIds()
    : showsOwnEvents
      ? await getPersonalEventIds()
      : undefined;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // All independent reads in one parallel batch: the fused count query, each card's
  // short list, and the guide. Wall-clock cost ≈ one round trip.
  const [counts, agendaRows, activeLoans, divisionRows, applicants, latestNews, openJobs, newFeedback, guide] =
    await Promise.all([
      fetchDashboardCounts(access, startOfMonth, access.events ? (agendaIds ?? null) : null),
      // Acara yang belum lewat, terdekat dulu. `total` menghitung semuanya, bukan hanya empat
      // yang tampil, supaya angka kartu dan barisnya berasal dari satu query.
      whenAllowed(agendaIds !== undefined && (agendaIds === null || agendaIds.length > 0), () =>
        db
          .select({
            id: events.id,
            title: events.title,
            coverImageUrl: events.coverImageUrl,
            status: events.status,
            startAt: events.startAt,
            endAt: events.endAt,
            capacity: events.capacity,
            registered: sql<number>`(select count(*) from event_registrations er where er.event_id = ${events.id} and er.status <> 'cancelled')::int`,
            total: sql<number>`(count(*) over())::int`,
          })
          .from(events)
          .where(
            and(
              isNull(events.deletedAt),
              inArray(events.status, ["published", "registration_closed"]),
              sql`coalesce(${events.endAt}, ${events.startAt}) >= now()`,
              agendaIds ? inArray(events.id, agendaIds) : undefined,
            ),
          )
          .orderBy(sql`${events.startAt} asc nulls last`)
          .limit(4),
      ),
      whenAllowed(access.inventory, () =>
        db
          .select({
            id: borrowRequests.id,
            itemName: inventoryItems.name,
            borrowerName: borrowRequests.borrowerName,
            userName: users.name,
            status: borrowRequests.status,
            requestedTo: borrowRequests.requestedTo,
          })
          .from(borrowRequests)
          .innerJoin(inventoryItems, eq(borrowRequests.itemId, inventoryItems.id))
          .leftJoin(users, eq(borrowRequests.userId, users.id))
          .where(inArray(borrowRequests.status, ["borrowed", "overdue"]))
          .orderBy(sql`case when ${borrowRequests.status} = 'overdue' then 0 else 1 end`, sql`${borrowRequests.requestedTo} asc nulls last`)
          .limit(3),
      ),
      whenAllowed(access.organization, () =>
        db
          .select({
            id: departments.id,
            name: departments.name,
            parentId: departments.parentDepartmentId,
            orderIndex: departments.orderIndex,
            members: sql<number>`count(${departmentMembers.userId})::int`,
          })
          .from(departments)
          .leftJoin(departmentMembers, eq(departmentMembers.departmentId, departments.id))
          .groupBy(departments.id),
      ),
      whenAllowed(access.membership, () =>
        db
          .select({
            id: membershipApplications.id,
            fullName: membershipApplications.fullName,
            divisionInterest: membershipApplications.divisionInterest,
            status: membershipApplications.status,
            submittedAt: membershipApplications.submittedAt,
          })
          .from(membershipApplications)
          .orderBy(desc(membershipApplications.submittedAt))
          .limit(3),
      ),
      whenAllowed(access.content, () =>
        db
          .select({ id: newsArticles.id, title: newsArticles.title, publishedAt: newsArticles.publishedAt })
          .from(newsArticles)
          .where(eq(newsArticles.status, "published"))
          .orderBy(sql`${newsArticles.publishedAt} desc nulls last`)
          .limit(3),
      ),
      whenAllowed(access.career, () =>
        db
          .select({
            id: jobPostings.id,
            title: jobPostings.title,
            company: jobPostings.company,
            deadline: jobPostings.applicationDeadline,
          })
          .from(jobPostings)
          .where(eq(jobPostings.status, "open"))
          .orderBy(desc(jobPostings.createdAt))
          .limit(2),
      ),
      whenAllowed(access.feedback, () =>
        db
          .select({ id: feedback.id, category: feedback.category, message: feedback.message, createdAt: feedback.createdAt })
          .from(feedback)
          .where(eq(feedback.status, "new"))
          .orderBy(desc(feedback.createdAt))
          .limit(3),
      ),
      getGuide("dashboard"),
    ]);

  const { users: userCounts, organization, sensus, content, career, membership, inventory } = counts;
  const eventCounts = counts.events;
  const feedbackCounts = counts.feedback;

  // ===== Perlu Tindakan: hanya antrean yang memang menunggu keputusan seseorang =====
  const attentionItems: AttentionItem[] = (
    [
      { icon: CalendarDays, label: "Acara menunggu persetujuan BPH", count: eventCounts?.awaitingApproval ?? 0, href: "/console/events" },
      { icon: Package, label: "Peminjaman terlambat dikembalikan", count: inventory?.overdueBorrow ?? 0, href: "/console/inventory", alarm: true },
      { icon: UserCheck, label: "Lamaran rekrutmen menunggu", count: membership?.pending ?? 0, href: "/console/membership" },
      { icon: MessageSquare, label: "Masukan baru", count: feedbackCounts?.unread ?? 0, href: "/console/feedback" },
      { icon: UserPlus, label: "Pendaftaran kegiatan menunggu", count: eventCounts?.pendingRegs ?? 0, href: "/console/events" },
      { icon: Package, label: "Pengajuan peminjaman menunggu", count: inventory?.pendingBorrow ?? 0, href: "/console/inventory" },
      { icon: Package, label: "Kontribusi barang menunggu", count: inventory?.pendingContrib ?? 0, href: "/console/inventory" },
      { icon: Package, label: "Permintaan pengadaan menunggu", count: inventory?.pendingProcure ?? 0, href: "/console/inventory" },
    ] satisfies AttentionItem[]
  ).filter((a) => a.count > 0);
  // Only modules that produce attention items; otherwise "nothing waiting" would be a
  // claim about modules this viewer cannot see.
  const showAttention = access.membership || access.feedback || access.events || access.inventory;
  const attentionTotal = attentionItems.reduce((sum, a) => sum + a.count, 0);

  // ===== Kartu modul =====
  const agenda: AgendaEvent[] = agendaRows.map((ev) => {
    const stage = eventStage(ev, now);
    const time = ev.startAt ? eventTimeLabel(ev.startAt) : null;
    return {
      id: ev.id,
      title: ev.title,
      coverImageUrl: ev.coverImageUrl,
      when: ev.startAt ? [eventDayLabel(ev.startAt), time].filter(Boolean).join(" · ") : "Tanggal belum diisi",
      countdown: stage === "berlangsung" ? "Sedang berlangsung" : ev.startAt ? eventCountdownLabel(ev.startAt, now) : null,
      registered: ev.registered,
      capacity: ev.capacity,
    };
  });
  const upcomingTotal = agendaRows[0]?.total ?? 0;

  const eventsNote = eventCounts
    ? [
        `${eventCounts.regsThisWeek} pendaftar minggu ini, ${eventCounts.regsLastWeek} minggu lalu`,
        eventCounts.draft > 0 ? `${eventCounts.draft} masih draf` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : undefined;
  const eventsCard =
    agendaIds === undefined
      ? null
      : (span: string) => (
          <DashboardCard
            id="kartu-kegiatan"
            className={span}
            title={access.events ? "Kegiatan" : "Kegiatan Saya"}
            href="/console/events"
            linkLabel="Buka Kegiatan"
            figure={upcomingTotal}
            figureLabel="acara mendatang"
            note={eventsNote}
          >
            <EventAgenda events={agenda} empty="Belum ada acara mendatang yang sudah diterbitkan." />
          </DashboardCard>
        );

  const smallCards: { key: string; node: (span: string) => ReactNode }[] = [];

  if (inventory) {
    smallCards.push({
      key: "inventaris",
      node: (span) => (
        <DashboardCard
          key="inventaris"
          id="kartu-inventaris"
          className={span}
          title="Inventaris"
          href="/console/inventory"
          linkLabel="Buka Inventaris"
          figure={inventory.items}
          figureLabel="jenis barang"
          note={
            inventory.overdueBorrow > 0
              ? `${inventory.overdueBorrow} peminjaman terlambat dikembalikan`
              : inventory.pendingBorrow > 0
                ? `${inventory.pendingBorrow} pengajuan peminjaman menunggu`
                : undefined
          }
          noteTone={inventory.overdueBorrow > 0 ? "alarm" : "muted"}
        >
          <RatioMeter
            value={inventory.unitsAvailable}
            max={inventory.unitsTotal}
            label="Unit yang tersedia"
            startLabel={`${inventory.unitsAvailable} unit tersedia`}
            endLabel={`dari ${inventory.unitsTotal}`}
          />
          <ShortList
            empty="Tidak ada barang yang sedang dipinjam."
            rows={activeLoans.map((loan) => ({
              key: loan.id,
              primary: loan.itemName,
              secondary: loan.borrowerName ?? loan.userName,
              trailing:
                loan.status === "overdue" ? "Terlambat" : loan.requestedTo ? `s.d. ${eventDayLabel(loan.requestedTo)}` : null,
              tone: loan.status === "overdue" ? "alarm" : undefined,
            }))}
          />
        </DashboardCard>
      ),
    });
  }

  if (organization) {
    const ordered = inTreeOrder(divisionRows);
    const shown = ordered.slice(0, 4);
    smallCards.push({
      key: "pengurus",
      node: (span) => (
        <DashboardCard
          key="pengurus"
          id="kartu-pengurus"
          className={span}
          title="Pengurus"
          href="/console/organization"
          linkLabel="Buka Organisasi"
          figure={organization.members}
          figureLabel={`pengurus di ${divisionRows.length} divisi`}
        >
          <DivisionBars
            rows={shown.map((d) => ({ key: d.id, name: d.name, count: d.members }))}
            more={ordered.length - shown.length}
          />
        </DashboardCard>
      ),
    });
  }

  if (membership) {
    smallCards.push({
      key: "rekrutmen",
      node: (span) => (
        <DashboardCard
          key="rekrutmen"
          id="kartu-rekrutmen"
          className={span}
          title="Rekrutmen"
          href="/console/membership"
          linkLabel="Buka Rekrutmen"
          figure={membership.pending}
          figureLabel="lamaran menunggu"
          note={membership.recruitOpen ? "Rekrutmen sedang dibuka" : "Rekrutmen sedang ditutup"}
          noteTone={membership.recruitOpen ? "positive" : "muted"}
        >
          <ShortList
            empty="Belum ada lamaran."
            rows={applicants.map((a) => ({
              key: a.id,
              primary: a.fullName,
              secondary: [a.divisionInterest, timeAgo(a.submittedAt)].filter(Boolean).join(" · "),
              trailing: APPLICATION_STATUS[a.status] ?? a.status,
              tone: a.status === "pending" ? "accent" : undefined,
            }))}
          />
        </DashboardCard>
      ),
    });
  }

  if (feedbackCounts) {
    smallCards.push({
      key: "masukan",
      node: (span) => (
        <DashboardCard
          key="masukan"
          id="kartu-masukan"
          className={span}
          title="Masukan"
          href="/console/feedback"
          linkLabel="Buka Masukan"
          figure={feedbackCounts.unread}
          figureLabel="masukan baru"
          note={`${feedbackCounts.total} masukan seluruhnya`}
        >
          <ShortList
            empty="Tidak ada masukan baru."
            rows={newFeedback.map((f) => ({
              key: f.id,
              primary: f.message,
              secondary: FEEDBACK_CATEGORY[f.category] ?? f.category,
              trailing: timeAgo(f.createdAt),
            }))}
          />
        </DashboardCard>
      ),
    });
  }

  if (content) {
    smallCards.push({
      key: "konten",
      node: (span) => (
        <DashboardCard
          key="konten"
          id="kartu-konten"
          className={span}
          title="Konten"
          href="/console/content"
          linkLabel="Buka Konten"
          figure={content.publishedNews}
          figureLabel="berita terbit"
          note={`${content.draftNews} draf · ${content.albums} album, ${content.photos} foto`}
        >
          <ShortList
            empty="Belum ada berita yang terbit."
            rows={latestNews.map((n) => ({
              key: n.id,
              primary: n.title,
              trailing: n.publishedAt ? eventDayLabel(n.publishedAt) : null,
            }))}
          />
        </DashboardCard>
      ),
    });
  }

  if (career) {
    smallCards.push({
      key: "lowongan",
      node: (span) => (
        <DashboardCard
          key="lowongan"
          id="kartu-lowongan"
          className={span}
          title="Lowongan"
          href="/console/jobs"
          linkLabel="Buka Lowongan"
          figure={career.openJobs}
          figureLabel="lowongan dibuka"
          note={`${career.applications} lamaran masuk`}
        >
          <ShortList
            empty="Tidak ada lowongan yang dibuka."
            rows={openJobs.map((j) => ({
              key: j.id,
              primary: j.title,
              secondary: j.company,
              trailing: j.deadline ? `s.d. ${eventDayLabel(j.deadline)}` : null,
            }))}
          />
        </DashboardCard>
      ),
    });
  }

  if (sensus) {
    const percent = sensus.members > 0 ? Math.round((sensus.complete / sensus.members) * 100) : 0;
    smallCards.push({
      key: "sensus",
      node: (span) => (
        <DashboardCard
          key="sensus"
          id="kartu-sensus"
          className={span}
          title="Sensus"
          href="/console/sensus"
          linkLabel="Buka Sensus"
          figure={sensus.complete}
          figureLabel="sensus lengkap"
        >
          <RatioMeter
            value={sensus.complete}
            max={sensus.members}
            label="Sensus lengkap dari semua akun"
            startLabel={`${percent}% lengkap`}
            endLabel={`dari ${sensus.members} akun`}
          />
          <FactRows
            rows={[
              { label: "Sudah mulai, belum lengkap", value: sensus.started - sensus.complete },
              { label: "Belum mengisi sama sekali", value: Math.max(sensus.members - sensus.started, 0) },
            ]}
          />
        </DashboardCard>
      ),
    });
  }

  if (userCounts) {
    smallCards.push({
      key: "pengguna",
      node: (span) => (
        <DashboardCard
          key="pengguna"
          id="kartu-pengguna"
          className={span}
          title="Pengguna"
          href="/console/users"
          linkLabel="Buka Pengguna"
          figure={userCounts.total}
          figureLabel="akun"
        >
          <FactRows
            rows={[
              { label: "Aktif", value: userCounts.active },
              { label: "Diundang, belum masuk", value: userCounts.invited },
              { label: "Nonaktif atau ditangguhkan", value: userCounts.inactive },
              { label: "Baru bulan ini", value: userCounts.newThisMonth },
            ]}
          />
        </DashboardCard>
      ),
    });
  }

  // Tanpa modul dashboard: Formulir adalah satu-satunya jalan lain selain Kegiatan Saya.
  const formsHub = hasModuleAccess(scope, "forms") || session.user.isBphCommittee || session.user.isEventKadiv || session.user.isCoordinator;
  if (!holdsAnyModule && (formsHub || session.user.canCreateSurvey)) {
    smallCards.push({
      key: "formulir",
      node: (span) => (
        <DashboardCard
          key="formulir"
          id="kartu-formulir"
          className={span}
          title="Formulir"
          href={formsHub ? "/console/forms" : "/formulir"}
          linkLabel="Buka Formulir"
          note={formsHub ? "Oprek, Pemilu, dan Formulir Kustom." : "Buat formulir sendiri dan lihat hasilnya."}
        />
      ),
    });
  }

  const spans = dashboardSpans(eventsCard !== null, smallCards.length);

  // Dipakai untuk semua akun: tanpa query (murni dari akses akun); kartu disembunyikan lewat cookie.
  const start = buildStartGuide({
    scope,
    isCommittee: session.user.isCommittee,
    isBphCommittee: session.user.isBphCommittee || session.user.isEventKadiv,
    isCoordinator: session.user.isCoordinator,
    canCreateSurvey: session.user.canCreateSurvey,
    canCreateEvent: session.user.canCreateEvent,
  });
  const startHidden = (await cookies()).get(START_HIDDEN_COOKIE)?.value === "1";

  const today = now.toLocaleDateString("id-ID", { timeZone: "Asia/Shanghai", weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const subline = showAttention
    ? `${today} · ${attentionTotal > 0 ? `${attentionTotal} menunggu tindakan` : "tidak ada yang menunggu tindakan"}`
    : today;

  return (
    <div className="mx-auto w-full max-w-[var(--container-max)] px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-headline-md sm:text-headline-lg text-on-background">Dashboard</h1>
          <p className="mt-1 text-body-md text-on-surface-variant">{subline}</p>
        </div>
        {guide && <GuideButton title={guide.title} content={guide.content} docSlug="dashboard" />}
      </div>

      {(blockedModule || blockedFeature) && (
        <p role="status" className="mb-6 rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 text-body-md text-on-background">
          {blockedModule ? (
            <>
              <span className="font-semibold">Akun ini belum memegang modul {blockedModule}.</span> Menu yang tampil di
              sidebar adalah yang bisa kamu buka. Kalau pekerjaanmu butuh modul itu, minta BPH menambahkannya untuk
              divisimu di Organisasi.
            </>
          ) : (
            <>
              <span className="font-semibold">Akun ini belum punya izin untuk halaman itu.</span> Izin fitur di sebuah
              acara diatur oleh BPH panitia acara tersebut (atau BPH kabinet). Tanyakan ke mereka kalau kamu perlu
              mengerjakannya.
            </>
          )}
        </p>
      )}
      <StartHere name={session.user.name ?? null} steps={start.steps} modules={start.modules} initialHidden={startHidden} />

      {showAttention && <AttentionList items={attentionItems} />}

      {eventsCard || smallCards.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
          {eventsCard?.(spans.wide)}
          {smallCards.map((card, i) => card.node(spans.small[i]))}
        </div>
      ) : (
        <p className="rounded-lg border border-outline-variant bg-surface-container-lowest px-5 py-4 text-body-md text-on-surface-variant">
          Menu yang bisa dibuka akun ini ada di sidebar.
        </p>
      )}
    </div>
  );
}
