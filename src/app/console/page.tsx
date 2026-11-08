import type { Metadata } from "next";
import { and, desc, eq, inArray, isNull, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  eventRegistrations,
  events,
  feedback,
  membershipApplications,
  users,
} from "@/db/schema";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { CollapsibleSection } from "@/components/console/collapsible-section";
import { GuideButton } from "@/components/console/guide-button";
import { StartHere } from "@/components/console/start-here";
import { START_HIDDEN_COOKIE, buildStartGuide } from "@/lib/console-start";
import { moduleLabel } from "@/lib/console-nav";
import { hasModuleAccess, type AdminModule } from "@/lib/admin-scope";
import { getScopedEventIds } from "@/lib/event-access";
import { getGuide } from "@/lib/guides";
import { ArrowRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import {
  Users,
  ClipboardCheck,
  ClipboardList,
  CalendarDays,
  FileText,
  UserPlus,
  Newspaper,
  Images,
  Briefcase,
  UserCheck,
  Package,
  MessageSquare,
} from "lucide-react";

// /console admits any admin, cabinet coordinator or event committee member, so the
// layout says nothing about WHICH modules this viewer holds. Every number, list
// row and shortcut on this page belongs to exactly one module below and is only
// queried and rendered for a viewer who holds it (AGENTS.md: each surface
// enforces its own module). Aliases (content/gallery) are resolved by
// hasModuleAccess(); "sensus" is the full census module, not "sensus-verify".
const DASHBOARD_MODULES = [
  "users",
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
  users?: { total: number; active: number; newThisMonth: number };
  sensus?: { complete: number; members: number };
  events?: {
    published: number;
    // Bagi full admin hanya yang sudah disetujui: draf percobaan pengurus lain bukan
    // pekerjaan BPH sampai diajukan.
    draft: number;
    // Menunggu keputusan BPH Kabinet. Selalu 0 selain untuk full admin.
    awaitingApproval: number;
    upcoming: number;
    regs: number;
    pendingRegs: number;
    attendedRegs: number;
    regsThisWeek: number;
    regsLastWeek: number;
  };
  content?: { publishedNews: number; draftNews: number; albums: number; photos: number };
  career?: { openJobs: number; applications: number };
  membership?: { pending: number; total: number; thisWeek: number; lastWeek: number; recruitOpen: boolean };
  inventory?: { items: number; pendingBorrow: number; overdueBorrow: number; pendingContrib: number; pendingProcure: number };
  feedback?: { total: number; unread: number };
};

// Perf: this used to fire 26 separate COUNT(*) queries through Promise.all -
// one HTTPS round trip each to the Neon ap-southeast-1 proxy. They are fused into
// ONE select of scalar subqueries (single round trip), and the whole batch in the
// page runs concurrently with the recent-activity and guide reads. Only the
// subqueries of modules the viewer holds go into that select; with none of them
// there is no query at all.
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
    );
  }
  if (access.sensus) {
    cols.push(
      sql`(select count(*) from sensus_profiles where completion_status = 'complete')::int as "sensusComplete"`,
      // Own denominator, so a census-only viewer doesn't depend on the users module's count.
      sql`(select count(*) from users)::int as "sensusMembers"`,
    );
  }
  if (access.events) {
    const ownEvents = eventIds === null ? sql`true` : inArray(events.id, eventIds);
    const ownRegs = eventIds === null ? sql`true` : inArray(eventRegistrations.eventId, eventIds);
    cols.push(
      sql`(select count(*) from events where status = 'published' and deleted_at is null and ${ownEvents})::int as "eventsPublished"`,
      sql`(select count(*) from events where status = 'draft' and deleted_at is null and ${eventIds === null ? sql`approved_at is not null` : ownEvents})::int as "eventsDraft"`,
      eventIds === null
        ? sql`(select count(*) from events where status = 'draft' and approval_requested_at is not null and approved_at is null and deleted_at is null)::int as "eventsAwaitingApproval"`
        : sql`0 as "eventsAwaitingApproval"`,
      sql`(select count(*) from events where status = 'published' and start_at >= now() and deleted_at is null and ${ownEvents})::int as "eventsUpcoming"`,
      sql`(select count(*) from event_registrations where ${ownRegs})::int as "regsTotal"`,
      sql`(select count(*) from event_registrations where status = 'pending' and ${ownRegs})::int as "regsPending"`,
      sql`(select count(*) from event_registrations where status = 'attended' and ${ownRegs})::int as "regsAttended"`,
      // Week-over-week trend (Mon-based weeks): this week vs the one before,
      // so the headline numbers read as movement, not wallpaper.
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
      sql`(select count(*) from membership_applications)::int as "membersTotal"`,
      sql`(select count(*) from membership_applications where submitted_at >= date_trunc('week', now()))::int as "membersThisWeek"`,
      sql`(select count(*) from membership_applications where submitted_at >= date_trunc('week', now()) - interval '7 days' and submitted_at < date_trunc('week', now()))::int as "membersLastWeek"`,
      sql`(select count(*) from recruitment_periods where is_open)::int as "recruitOpenPeriods"`,
    );
  }
  if (access.inventory) {
    cols.push(
      sql`(select count(*) from inventory_items)::int as "inventoryItems"`,
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
    users: access.users ? { total: r.usersTotal, active: r.usersActive, newThisMonth: r.usersNew } : undefined,
    sensus: access.sensus ? { complete: r.sensusComplete, members: r.sensusMembers } : undefined,
    events: access.events
      ? {
          published: r.eventsPublished,
          draft: r.eventsDraft,
          awaitingApproval: r.eventsAwaitingApproval,
          upcoming: r.eventsUpcoming,
          regs: r.regsTotal,
          pendingRegs: r.regsPending,
          attendedRegs: r.regsAttended,
          regsThisWeek: r.regsThisWeek,
          regsLastWeek: r.regsLastWeek,
        }
      : undefined,
    content: access.content
      ? { publishedNews: r.newsPublished, draftNews: r.newsDraft, albums: r.albums, photos: r.photos }
      : undefined,
    career: access.career ? { openJobs: r.jobsOpen, applications: r.jobApplications } : undefined,
    membership: access.membership
      ? {
          pending: r.membersPending,
          total: r.membersTotal,
          thisWeek: r.membersThisWeek,
          lastWeek: r.membersLastWeek,
          recruitOpen: r.recruitOpenPeriods > 0,
        }
      : undefined,
    inventory: access.inventory
      ? {
          items: r.inventoryItems,
          pendingBorrow: r.borrowPending,
          overdueBorrow: r.borrowOverdue,
          pendingContrib: r.contribPending,
          pendingProcure: r.procurePending,
        }
      : undefined,
    feedback: access.feedback ? { total: r.feedbackTotal, unread: r.feedbackNew } : undefined,
  };
}

// Runs `run` only when the viewer may see the section: the query is not even
// built otherwise.
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
  return d.toLocaleDateString("id-ID", { timeZone: "Asia/Shanghai", dateStyle: "medium" });
}

// "a", "a dan b", "a, b, dan c"
function joinList(parts: string[]) {
  if (parts.length <= 2) return parts.join(" dan ");
  return `${parts.slice(0, -1).join(", ")}, dan ${parts[parts.length - 1]}`;
}

type Stat = { icon: LucideIcon; label: string; value: number | string; sub?: string; attention?: boolean };

// "▲ 12 minggu ini (vs 8)" - movement at a glance; null when both weeks are
// empty so dormant modules don't show a meaningless dash.
function weeklyTrend(thisWeek: number, lastWeek: number): string | null {
  if (thisWeek === 0 && lastWeek === 0) return null;
  const arrow = thisWeek > lastWeek ? "▲" : thisWeek < lastWeek ? "▼" : "–";
  return `${arrow} ${thisWeek} minggu ini (vs ${lastWeek})`;
}

// Shown instead of the org-wide numbers when the viewer holds no module that has
// anything on the dashboard (event committee member, cabinet coordinator, or a
// scoped admin whose modules are all elsewhere in the sidebar). Needs no query.
function DashboardLanding({
  name,
  scope,
  isCommittee,
  isCoordinator,
  canManageOprek,
  canCreateSurvey,
  canCreateEvent,
  top,
}: {
  name: string | null | undefined;
  scope: "full" | string[] | null;
  isCommittee: boolean;
  isCoordinator: boolean;
  canManageOprek: boolean;
  canCreateSurvey: boolean;
  canCreateEvent: boolean;
  // Catatan akses ditolak + kartu "Mulai dari sini" (sama dengan dashboard penuh).
  top: React.ReactNode;
}) {
  // Same visibility rules as the sidebar (console-sidebar.tsx): these links are
  // only offered where the destination page admits the viewer. (The "events"
  // module itself is a dashboard module, so its holders never get here.)
  const links: { icon: LucideIcon; label: string; description: string; href: string }[] = [];
  if (isCommittee || canCreateEvent) {
    links.push({
      icon: CalendarDays,
      label: "Kegiatan",
      description: canCreateEvent ? "Buat draf acara, atau buka acara yang kamu ikuti." : "Acara yang diikuti sebagai panitia.",
      href: "/console/events",
    });
  }
  if (hasModuleAccess(scope, "forms") || canManageOprek || isCoordinator) {
    links.push({
      icon: FileText,
      label: "Formulir",
      description: "Formulir dan Oprek untuk divisi atau kepanitiaan.",
      href: "/console/forms",
    });
  }
  if (canCreateSurvey) {
    links.push({
      icon: ClipboardList,
      label: "Formulir Kustom",
      description: "Buat formulir sendiri dan lihat hasilnya.",
      href: "/formulir",
    });
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="mb-8">
        <h1 className="text-headline-md sm:text-headline-lg text-on-background">Dashboard</h1>
        <p className="text-body-md text-on-surface-variant mt-1">
          {name ? `Halo, ${name}. ` : ""}
          Ringkasan lintas-modul hanya tampil untuk modul yang aksesnya diberikan ke akun ini.
        </p>
      </div>

      {top}

      <CollapsibleSection title="Yang Bisa Dibuka" description="Jalan pintas sesuai peran akun ini.">
        {links.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="flex items-start gap-3 bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-3 hover:bg-surface-container-low transition-colors"
              >
                <l.icon size={18} className="text-primary-container mt-0.5 shrink-0" />
                <span className="flex flex-col gap-0.5">
                  <span className="text-body-md text-on-background">{l.label}</span>
                  <span className="text-body-sm text-on-surface-variant">{l.description}</span>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-body-md text-on-surface-variant">Belum ada jalan pintas untuk akun ini.</p>
        )}
        <p className="text-body-sm text-on-surface-variant mt-4">Menu lain yang tersedia untuk akun ini ada di sidebar.</p>
      </CollapsibleSection>
    </div>
  );
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

  // Dipakai dashboard penuh maupun landing: tanpa query (murni dari akses akun); kartu disembunyikan lewat cookie.
  const start = buildStartGuide({
    scope,
    isCommittee: session.user.isCommittee,
    isBphCommittee: session.user.isBphCommittee || session.user.isEventKadiv,
    isCoordinator: session.user.isCoordinator,
    canCreateSurvey: session.user.canCreateSurvey,
    canCreateEvent: session.user.canCreateEvent,
  });
  const startHidden = (await cookies()).get(START_HIDDEN_COOKIE)?.value === "1";
  const top = (
    <>
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
    </>
  );

  // No module with anything on the dashboard: no org-wide reads at all (not even
  // the guide), just the landing.
  if (!DASHBOARD_MODULES.some((m) => access[m])) {
    return (
      <DashboardLanding
        name={session.user.name}
        scope={scope}
        isCommittee={session.user.isCommittee}
        isCoordinator={session.user.isCoordinator}
        canManageOprek={session.user.isBphCommittee || session.user.isEventKadiv}
        canCreateSurvey={session.user.canCreateSurvey}
        canCreateEvent={session.user.canCreateEvent}
        top={top}
      />
    );
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // null for a full admin (all events, no extra query); a scoped events holder
  // costs one extra wave to learn which events are theirs.
  const eventIds = access.events ? await getScopedEventIds() : null;

  // All independent reads in one parallel batch: the fused count query, three
  // recent-activity lists, and the guide. Wall-clock cost ≈ one round trip.
  const [counts, recentFeedback, recentRegs, recentMembers, guide] = await Promise.all([
    fetchDashboardCounts(access, startOfMonth, eventIds),
    whenAllowed(access.feedback, () =>
      db
        .select({ id: feedback.id, category: feedback.category, message: feedback.message, status: feedback.status, createdAt: feedback.createdAt })
        .from(feedback)
        .orderBy(desc(feedback.createdAt))
        .limit(6),
    ),
    whenAllowed(access.events, () =>
      db
        .select({
          id: eventRegistrations.id,
          eventTitle: events.title,
          userName: users.name,
          status: eventRegistrations.status,
          createdAt: eventRegistrations.registeredAt,
        })
        .from(eventRegistrations)
        .leftJoin(events, eq(eventRegistrations.eventId, events.id))
        .leftJoin(users, eq(eventRegistrations.userId, users.id))
        .where(and(isNull(events.deletedAt), eventIds === null ? undefined : inArray(eventRegistrations.eventId, eventIds)))
        .orderBy(desc(eventRegistrations.registeredAt))
        .limit(6),
    ),
    whenAllowed(access.membership, () =>
      db
        .select({ id: membershipApplications.id, fullName: membershipApplications.fullName, status: membershipApplications.status, createdAt: membershipApplications.submittedAt })
        .from(membershipApplications)
        .orderBy(desc(membershipApplications.submittedAt))
        .limit(6),
    ),
    getGuide("dashboard"),
  ]);

  const { users: userCounts, sensus, content, career, membership, inventory } = counts;
  const eventCounts = counts.events;
  const feedbackCounts = counts.feedback;

  const feedSources = [
    access.feedback ? "masukan" : null,
    access.events ? "pendaftaran" : null,
    access.membership ? "lamaran" : null,
  ].filter((s): s is string => s !== null);
  const feedSummary = joinList(feedSources);

  const feed = [
    ...recentFeedback.map((f) => ({
      time: f.createdAt,
      href: "/console/feedback",
      text: `Masukan ${f.category}: ${f.message.slice(0, 60)}${f.message.length > 60 ? "…" : ""}`,
      attention: f.status === "new",
    })),
    ...recentRegs.map((r) => ({
      time: r.createdAt,
      href: "/console/events",
      text: `${r.userName ?? "Seseorang"} mendaftar: ${r.eventTitle ?? "kegiatan"}`,
      attention: r.status === "pending",
    })),
    ...recentMembers.map((m) => ({
      time: m.createdAt,
      href: `/console/membership/${m.id}`,
      text: `Lamaran rekrutmen: ${m.fullName}`,
      attention: m.status === "pending",
    })),
  ]
    .sort((a, b) => b.time.getTime() - a.time.getTime())
    .slice(0, 8);

  // Card order is fixed (Anggota ... Masukan); a module the viewer lacks simply
  // contributes no card.
  const stats: Stat[] = [];
  if (userCounts) {
    stats.push({ icon: Users, label: "Anggota", value: userCounts.total, sub: `${userCounts.active} aktif · ${userCounts.newThisMonth} baru bulan ini` });
  }
  if (sensus) {
    stats.push({ icon: ClipboardCheck, label: "Sensus Lengkap", value: sensus.complete, sub: `dari ${sensus.members} anggota` });
  }
  if (eventCounts) {
    const regsTrend = weeklyTrend(eventCounts.regsThisWeek, eventCounts.regsLastWeek);
    stats.push(
      { icon: CalendarDays, label: "Kegiatan", value: eventCounts.published, sub: `${eventCounts.draft} draf · ${eventCounts.upcoming} akan datang`, attention: eventCounts.draft > 0 },
      { icon: UserPlus, label: "Pendaftar", value: eventCounts.regs, sub: [regsTrend, `${eventCounts.pendingRegs} menunggu · ${eventCounts.attendedRegs} hadir`].filter(Boolean).join(" · "), attention: eventCounts.pendingRegs > 0 },
    );
  }
  if (content) {
    stats.push(
      { icon: Newspaper, label: "Berita", value: content.publishedNews, sub: `${content.draftNews} draf`, attention: content.draftNews > 0 },
      { icon: Images, label: "Galeri", value: content.albums, sub: `${content.photos} foto` },
    );
  }
  if (career) {
    stats.push({ icon: Briefcase, label: "Lowongan", value: career.openJobs, sub: `${career.applications} lamaran` });
  }
  if (membership) {
    const membersTrend = weeklyTrend(membership.thisWeek, membership.lastWeek);
    stats.push({
      icon: UserCheck,
      label: "Rekrutmen",
      value: membership.total,
      sub: [membersTrend, `${membership.pending} menunggu · rekrutmen ${membership.recruitOpen ? "dibuka" : "ditutup"}`].filter(Boolean).join(" · "),
      attention: membership.pending > 0,
    });
  }
  if (inventory) {
    const borrowing = inventory.pendingBorrow + inventory.overdueBorrow;
    stats.push({ icon: Package, label: "Inventaris", value: inventory.items, sub: `${borrowing} dipinjam/terlambat`, attention: borrowing > 0 });
  }
  if (feedbackCounts) {
    stats.push({ icon: MessageSquare, label: "Masukan", value: feedbackCounts.total, sub: `${feedbackCounts.unread} baru`, attention: feedbackCounts.unread > 0 });
  }

  // Counts of modules the viewer lacks are absent (0 here) and filtered out.
  const attentionItems = [
    { icon: CalendarDays, label: "Acara menunggu persetujuan BPH", count: eventCounts?.awaitingApproval ?? 0, href: "/console/events" },
    { icon: UserCheck, label: "Lamaran rekrutmen menunggu", count: membership?.pending ?? 0, href: "/console/membership" },
    { icon: MessageSquare, label: "Masukan baru", count: feedbackCounts?.unread ?? 0, href: "/console/feedback" },
    { icon: UserPlus, label: "Pendaftaran kegiatan menunggu", count: eventCounts?.pendingRegs ?? 0, href: "/console/events" },
    { icon: Package, label: "Permintaan peminjaman", count: (inventory?.pendingBorrow ?? 0) + (inventory?.overdueBorrow ?? 0), href: "/console/inventory" },
    { icon: Package, label: "Kontribusi barang menunggu", count: inventory?.pendingContrib ?? 0, href: "/console/inventory" },
    { icon: Package, label: "Permintaan pengadaan", count: inventory?.pendingProcure ?? 0, href: "/console/inventory" },
    { icon: CalendarDays, label: "Kegiatan masih draf", count: eventCounts?.draft ?? 0, href: "/console/events" },
    { icon: Newspaper, label: "Berita masih draf", count: content?.draftNews ?? 0, href: "/console/content" },
  ].filter((a) => a.count > 0);
  // Only modules that produce attention items; otherwise "all handled" would be
  // a claim about modules this viewer cannot see.
  const showAttention = access.membership || access.feedback || access.events || access.inventory || access.content;

  const allQuickActions: { module: DashboardModule; icon: LucideIcon; label: string; href: string }[] = [
    { module: "events", icon: CalendarDays, label: "Buat Kegiatan", href: "/console/events" },
    { module: "content", icon: Newspaper, label: "Tulis Berita", href: "/console/content/news/new" },
    { module: "content", icon: Images, label: "Album Baru", href: "/console/content/gallery/new" },
    { module: "inventory", icon: Package, label: "Kelola Inventaris", href: "/console/inventory" },
    { module: "feedback", icon: MessageSquare, label: "Lihat Masukan", href: "/console/feedback" },
    { module: "users", icon: Users, label: "Daftar Anggota", href: "/console/users" },
  ];
  const quickActions = allQuickActions.filter((q) => access[q.module]);

  const today = new Date().toLocaleDateString("id-ID", { timeZone: "Asia/Shanghai", weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-8">
        <div>
          <h1 className="text-headline-md sm:text-headline-lg text-on-background">Dashboard</h1>
          <p className="text-body-md text-on-surface-variant mt-1">Ringkasan aktivitas PPIT Nanjing · {today}</p>
        </div>
        {guide && <GuideButton title={guide.title} content={guide.content} docSlug="dashboard" />}
      </div>

      {top}

      <div className="flex flex-col gap-6">
        <CollapsibleSection
          title="Ringkasan"
          description={scope === "full" ? "Angka utama di seluruh modul." : "Angka utama dari modul yang aksesnya diberikan ke akun ini."}
        >
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
            {stats.map((s) => (
              <div key={s.label} className="bg-surface-container-low border border-outline-variant rounded-lg p-5 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <s.icon size={18} />
                  <span className="text-label-caps uppercase tracking-wide">{s.label}</span>
                </div>
                <p className="text-display-hero-mobile text-on-background leading-none">{s.value}</p>
                {s.sub ? (
                  <p className={`text-body-sm ${s.attention ? "text-primary-container" : "text-on-surface-variant"}`}>{s.sub}</p>
                ) : null}
              </div>
            ))}
          </div>
        </CollapsibleSection>

        {showAttention && (
          <CollapsibleSection title="Perlu Perhatian" description="Item yang butuh tindakan dari admin.">
            {attentionItems.length === 0 ? (
              <p className="text-body-md text-on-surface-variant">Tidak ada item yang perlu perhatian. Semua tertangani.</p>
            ) : (
              <div className="flex flex-col divide-y divide-outline-variant border border-outline-variant rounded-xl overflow-hidden">
                {attentionItems.map((a) => (
                  <div key={a.label} className="flex items-center gap-3 px-5 py-3 bg-surface-container-lowest">
                    <a.icon size={18} className="text-secondary shrink-0" />
                    <span className="text-body-md text-on-background flex-1">{a.label}</span>
                    <span className="text-label-caps bg-primary-container text-on-primary px-2.5 py-1 rounded-full shrink-0">{a.count}</span>
                    <a
                      href={a.href}
                      className="flex min-h-11 items-center gap-1 px-2 text-label-caps text-primary-container hover:text-primary transition-colors shrink-0"
                    >
                      Tinjau <ArrowRight size={14} />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleSection>
        )}

        {quickActions.length > 0 && (
          <CollapsibleSection title="Aksi Cepat" description="Jalan pintas ke alur kerja umum.">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {quickActions.map((q) => (
                <Link
                  key={q.label}
                  href={q.href}
                  className="flex items-center gap-3 bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-3 hover:bg-surface-container-low transition-colors"
                >
                  <q.icon size={18} className="text-primary-container" />
                  <span className="text-body-md text-on-background">{q.label}</span>
                </Link>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {feedSources.length > 0 && (
          <CollapsibleSection
            title="Aktivitas Terbaru"
            description={`${feedSummary.charAt(0).toUpperCase()}${feedSummary.slice(1)} terbaru.`}
          >
            {feed.length === 0 ? (
              <p className="text-body-md text-on-surface-variant">Belum ada aktivitas tercatat.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {feed.map((item, i) => (
                  <a
                    key={i}
                    href={item.href}
                    className="flex items-center gap-3 bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-3 hover:bg-surface-container-low transition-colors"
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${item.attention ? "bg-primary-container" : "bg-outline-variant"}`} />
                    <span className="text-body-md text-on-background flex-1 truncate">{item.text}</span>
                    <span className="text-label-caps text-on-surface-variant shrink-0">{timeAgo(item.time)}</span>
                  </a>
                ))}
              </div>
            )}
          </CollapsibleSection>
        )}
      </div>
    </div>
  );
}
