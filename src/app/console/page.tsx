import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  eventRegistrations,
  events,
  feedback,
  membershipApplications,
  users,
} from "@/db/schema";
import { CollapsibleSection } from "@/components/console/collapsible-section";
import { GuideButton } from "@/components/console/guide-button";
import { getGuide } from "@/lib/guides";
import { ArrowRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import {
  Users,
  ClipboardCheck,
  CalendarDays,
  UserPlus,
  Newspaper,
  Images,
  Briefcase,
  UserCheck,
  Package,
  MessageSquare,
} from "lucide-react";

// Perf: this used to fire 26 separate COUNT(*) queries through Promise.all -
// one HTTPS round trip each to the Neon ap-southeast-1 proxy. All of them are
// fused into ONE select of scalar subqueries (single round trip), and the whole
// batch below runs concurrently with the recent-activity and guide reads.
type DashboardCounts = {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  sensusComplete: number;
  publishedEvents: number;
  draftEvents: number;
  upcomingEvents: number;
  totalRegs: number;
  pendingRegs: number;
  attendedRegs: number;
  publishedNews: number;
  draftNews: number;
  totalAlbums: number;
  totalPhotos: number;
  openJobs: number;
  totalApps: number;
  pendingMembers: number;
  totalMembers: number;
  isRecruitOpen: boolean;
  totalItems: number;
  pendingBorrow: number;
  overdueBorrow: number;
  pendingContrib: number;
  pendingProcure: number;
  totalFeedback: number;
  newFeedback: number;
};

async function fetchDashboardCounts(startOfMonth: Date): Promise<DashboardCounts> {
  const result = await db.execute<DashboardCounts>(sql`
    select
      (select count(*) from users)::int as "totalUsers",
      (select count(*) from users where status = 'active')::int as "activeUsers",
      (select count(*) from users where created_at >= ${startOfMonth})::int as "newUsers",
      (select count(*) from sensus_profiles where completion_status = 'complete')::int as "sensusComplete",
      (select count(*) from events where status = 'published')::int as "publishedEvents",
      (select count(*) from events where status = 'draft')::int as "draftEvents",
      (select count(*) from events where status = 'published' and start_at >= now())::int as "upcomingEvents",
      (select count(*) from event_registrations)::int as "totalRegs",
      (select count(*) from event_registrations where status = 'pending')::int as "pendingRegs",
      (select count(*) from event_registrations where status = 'attended')::int as "attendedRegs",
      (select count(*) from news_articles where status = 'published')::int as "publishedNews",
      (select count(*) from news_articles where status = 'draft')::int as "draftNews",
      (select count(*) from gallery_albums)::int as "totalAlbums",
      (select count(*) from gallery_photos)::int as "totalPhotos",
      (select count(*) from job_postings where status = 'open')::int as "openJobs",
      (select count(*) from job_applications)::int as "totalApps",
      (select count(*) from membership_applications where status = 'pending')::int as "pendingMembers",
      (select count(*) from membership_applications)::int as "totalMembers",
      (select exists(select 1 from recruitment_periods where is_open)) as "isRecruitOpen",
      (select count(*) from inventory_items)::int as "totalItems",
      (select count(*) from borrow_requests where status = 'pending')::int as "pendingBorrow",
      (select count(*) from borrow_requests where status = 'overdue')::int as "overdueBorrow",
      (select count(*) from item_contributions where status = 'pending')::int as "pendingContrib",
      (select count(*) from procurement_requests where status = 'pending')::int as "pendingProcure",
      (select count(*) from feedback)::int as "totalFeedback",
      (select count(*) from feedback where status = 'new')::int as "newFeedback"
  `);
  return result.rows[0];
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
  return d.toLocaleDateString("id-ID");
}

export default async function ConsoleDashboardPage() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // All independent reads in one parallel batch: the fused count query, three
  // recent-activity lists, and the guide. Wall-clock cost ≈ one round trip.
  const [counts, recentFeedback, recentRegs, recentMembers, guide] = await Promise.all([
    fetchDashboardCounts(startOfMonth),
    db
      .select({ id: feedback.id, category: feedback.category, message: feedback.message, status: feedback.status, createdAt: feedback.createdAt })
      .from(feedback)
      .orderBy(desc(feedback.createdAt))
      .limit(6),
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
      .orderBy(desc(eventRegistrations.registeredAt))
      .limit(6),
    db
      .select({ id: membershipApplications.id, fullName: membershipApplications.fullName, status: membershipApplications.status, createdAt: membershipApplications.submittedAt })
      .from(membershipApplications)
      .orderBy(desc(membershipApplications.submittedAt))
      .limit(6),
    getGuide("dashboard"),
  ]);

  const {
    totalUsers,
    activeUsers,
    newUsers,
    sensusComplete,
    publishedEvents,
    draftEvents,
    upcomingEvents,
    totalRegs,
    pendingRegs,
    attendedRegs,
    publishedNews,
    draftNews,
    totalAlbums,
    totalPhotos,
    openJobs,
    totalApps,
    pendingMembers,
    totalMembers,
    isRecruitOpen,
    totalItems,
    pendingBorrow,
    overdueBorrow,
    pendingContrib,
    pendingProcure,
    totalFeedback,
    newFeedback,
  } = counts;

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
      text: `Lamaran membership: ${m.fullName}`,
      attention: m.status === "pending",
    })),
  ]
    .sort((a, b) => b.time.getTime() - a.time.getTime())
    .slice(0, 8);

  const stats: { icon: LucideIcon; label: string; value: number | string; sub?: string; attention?: boolean }[] = [
    { icon: Users, label: "Anggota", value: totalUsers, sub: `${activeUsers} aktif · ${newUsers} baru bulan ini` },
    { icon: ClipboardCheck, label: "Sensus Lengkap", value: sensusComplete, sub: `dari ${totalUsers} anggota` },
    { icon: CalendarDays, label: "Kegiatan", value: publishedEvents, sub: `${draftEvents} draf · ${upcomingEvents} akan datang`, attention: draftEvents > 0 },
    { icon: UserPlus, label: "Pendaftar", value: totalRegs, sub: `${pendingRegs} menunggu · ${attendedRegs} hadir`, attention: pendingRegs > 0 },
    { icon: Newspaper, label: "Berita", value: publishedNews, sub: `${draftNews} draf`, attention: draftNews > 0 },
    { icon: Images, label: "Galeri", value: totalAlbums, sub: `${totalPhotos} foto` },
    { icon: Briefcase, label: "Lowongan", value: openJobs, sub: `${totalApps} lamaran` },
    {
      icon: UserCheck,
      label: "Membership",
      value: totalMembers,
      sub: `${pendingMembers} menunggu · rekrutmen ${isRecruitOpen ? "dibuka" : "ditutup"}`,
      attention: pendingMembers > 0,
    },
    { icon: Package, label: "Inventaris", value: totalItems, sub: `${pendingBorrow + overdueBorrow} dipinjam/terlambat`, attention: pendingBorrow + overdueBorrow > 0 },
    { icon: MessageSquare, label: "Masukan", value: totalFeedback, sub: `${newFeedback} baru`, attention: newFeedback > 0 },
  ];

  const attentionItems = [
    { icon: UserCheck, label: "Lamaran membership menunggu", count: pendingMembers, href: "/console/membership" },
    { icon: MessageSquare, label: "Masukan baru", count: newFeedback, href: "/console/feedback" },
    { icon: UserPlus, label: "Pendaftaran kegiatan menunggu", count: pendingRegs, href: "/console/events" },
    { icon: Package, label: "Permintaan peminjaman", count: pendingBorrow + overdueBorrow, href: "/console/inventory" },
    { icon: Package, label: "Kontribusi barang menunggu", count: pendingContrib, href: "/console/inventory" },
    { icon: Package, label: "Permintaan pengadaan", count: pendingProcure, href: "/console/inventory" },
    { icon: CalendarDays, label: "Kegiatan masih draf", count: draftEvents, href: "/console/events" },
    { icon: Newspaper, label: "Berita masih draf", count: draftNews, href: "/console/content" },
  ].filter((a) => a.count > 0);

  const quickActions = [
    { icon: CalendarDays, label: "Buat Kegiatan", href: "/console/events" },
    { icon: Newspaper, label: "Tulis Berita", href: "/console/content/news/new" },
    { icon: Images, label: "Album Baru", href: "/console/content/gallery/new" },
    { icon: Package, label: "Kelola Inventaris", href: "/console/inventory" },
    { icon: MessageSquare, label: "Lihat Masukan", href: "/console/feedback" },
    { icon: Users, label: "Daftar Anggota", href: "/console/users" },
  ];

  const today = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-8">
        <div>
          <h1 className="text-headline-md sm:text-headline-lg text-on-background">Dashboard</h1>
          <p className="text-body-md text-on-surface-variant mt-1">Ringkasan aktivitas PPIT Nanjing · {today}</p>
        </div>
        {guide && <GuideButton title={guide.title} content={guide.content} docSlug="dashboard" />}
      </div>

      <div className="flex flex-col gap-6">
        <CollapsibleSection title="Ringkasan" description="Angka utama di seluruh modul.">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
                    className="flex items-center gap-1 text-label-caps text-primary-container hover:text-primary transition-colors shrink-0"
                  >
                    Tinjau <ArrowRight size={14} />
                  </a>
                </div>
              ))}
            </div>
          )}
        </CollapsibleSection>

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

        <CollapsibleSection title="Aktivitas Terbaru" description="Masukan, pendaftaran, dan lamaran terbaru.">
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
      </div>
    </div>
  );
}
