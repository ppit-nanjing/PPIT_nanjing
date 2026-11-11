import {
  MessageSquare,
  LayoutDashboard,
  Users,
  Building2,
  CalendarDays,
  Package,
  FileBarChart,
  BookOpen,
  Images,
  Store,
  ClipboardList,
  ClipboardCheck,
  UserPlus,
  Briefcase,
  BellRing,
  Link2,
  Folder,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { hasModuleAccess, type AdminModule } from "@/lib/admin-scope-constants";

// Satu-satunya daftar menu konsol: sidebar membacanya dari sini, beserta aturan siapa melihat
// menu apa dan `hint` untuk tooltip-nya.

export type NavItem = {
  href: string;
  label: string;
  // Satu kalimat awam tentang isi menu ini, tampil sebagai tooltip.
  hint: string;
  icon: LucideIcon;
  // Satu modul, atau beberapa (tampil kalau punya salah satu — mis. Sensus
  // untuk pemegang "sensus" ATAU "sensus-verify").
  module: AdminModule | AdminModule[] | null;
  // Juga tampil untuk panitia acara (non-admin) walau tidak punya modul-nya.
  committeeToo?: boolean;
  // Khusus BPH Acara (ketua/wakil/sekretaris/bendahara/supervisor) — menu
  // Formulir/Oprek Kepanitiaan. Panitia biasa tidak dapat menu ini.
  bphCommitteeToo?: boolean;
  // Juga tampil untuk Koordinator Divisi (role scoped) — mis. menu Formulir,
  // supaya tiap koor bisa bikin form Oprek BPH untuk prokernya. Flag ini
  // hanya visibilitas; gerbang sebenarnya ada di page/action masing-masing.
  coordinatorToo?: boolean;
  // Juga tampil untuk yang boleh membuat Formulir Kustom (session.user.canCreateSurvey): kartu
  // Formulir Kustom ada di hub Formulir, jadi hub itu harus terjangkau oleh mereka.
  customFormsToo?: boolean;
  // Juga tampil untuk yang boleh membuat draf acara (session.user.canCreateEvent).
  eventCreatorToo?: boolean;
};

// `module: null` = always visible to anyone who got past the layout gate
// (Dashboard, Documentation are meta/support, not sensitive management).
// `module: "users"/"organization"/"feedback"` aren't delegable via
// adminModuleScope (no seed row lists them) - full tier only.
export const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Utama",
    items: [
      { href: "/console", label: "Dashboard", hint: "Ringkasan dan hal yang perlu ditindak", icon: LayoutDashboard, module: null },
      // Di grup Utama, bukan di dasar sidebar: bantuan harus selalu terlihat tanpa menggulir.
      { href: "/console/docs", label: "Dokumentasi", hint: "Panduan memakai konsol, per modul", icon: BookOpen, module: null },
    ],
  },
  {
    title: "Manajemen",
    items: [
      { href: "/console/users", label: "Pengguna", hint: "Akun, divisi, dan status pengurus", icon: Users, module: "users" },
      { href: "/console/organization", label: "Organisasi", hint: "Struktur kabinet, divisi, dan anggotanya", icon: Building2, module: "organization" },
      { href: "/console/events", label: "Kegiatan", hint: "Acara: pendaftar, pembayaran, panitia, dan sertifikat", icon: CalendarDays, module: "events", committeeToo: true, eventCreatorToo: true },
      { href: "/console/work-ledger", label: "Work Ledger", hint: "Beban kerja panitia, pembayaran, dan sertifikat lintas acara", icon: ClipboardList, module: "events" },
      { href: "/console/inventory", label: "Inventaris", hint: "Barang organisasi, peminjaman, dan pengembalian", icon: Package, module: "inventory" },
      { href: "/console/membership", label: "Rekrutmen", hint: "Lamaran masuk kabinet (rekrutmen pengurus)", icon: UserPlus, module: "membership" },
      { href: "/console/forms", label: "Formulir", hint: "Pemilu, Oprek, dan Formulir Kustom", icon: FileText, module: "forms", bphCommitteeToo: true, coordinatorToo: true, customFormsToo: true },
      { href: "/console/jobs", label: "Lowongan", hint: "Pasang lowongan kerja dan proses lamaran", icon: Briefcase, module: "career" },
      { href: "/console/sensus", label: "Sensus", hint: "Data mahasiswa dari sensus: periksa dan verifikasi", icon: ClipboardCheck, module: ["sensus", "sensus-verify"] },
      { href: "/console/ranting/sensus", label: "Sensus Ranting", hint: "Ringkasan sensus untuk kampus rantingmu", icon: ClipboardCheck, module: "sensus-ranting" },
      { href: "/console/content", label: "Konten", hint: "Berita dan galeri untuk situs publik", icon: Images, module: "content" },
      { href: "/console/katalog", label: "Kota & Katalog", hint: "Kota naungan, kampus, tempat, merchandise, dan sponsor", icon: Store, module: "content" },
    ],
  },
  {
    title: "Sistem",
    items: [
      { href: "/console/reports", label: "Laporan", hint: "Laporan dan ekspor data", icon: FileBarChart, module: "reports" },
      { href: "/console/notifications", label: "Notifikasi", hint: "Isi pesan otomatis yang dikirim ke pengguna", icon: BellRing, module: "notifications" },
      { href: "/console/feedback", label: "Masukan Pengguna", hint: "Kritik dan laporan masalah dari pengguna situs", icon: MessageSquare, module: "feedback" },
      { href: "/console/links", label: "Tautan", hint: "Tautan pendek dan kode QR", icon: Link2, module: "links" },
      { href: "/console/documents", label: "Dokumen", hint: "Berkas organisasi di Google Drive", icon: Folder, module: "documents" },
    ],
  },
];

export type NavAccess = {
  scope: "full" | string[] | null;
  isCommittee?: boolean;
  isBphCommittee?: boolean;
  isCoordinator?: boolean;
  canCreateSurvey?: boolean;
  canCreateEvent?: boolean;
};

export function canSeeNavItem(item: NavItem, a: NavAccess): boolean {
  return (
    item.module === null ||
    (Array.isArray(item.module)
      ? item.module.some((m) => hasModuleAccess(a.scope, m))
      : hasModuleAccess(a.scope, item.module)) ||
    (!!item.committeeToo && !!a.isCommittee) ||
    (!!item.bphCommitteeToo && !!a.isBphCommittee) ||
    (!!item.coordinatorToo && !!a.isCoordinator) ||
    (!!item.customFormsToo && !!a.canCreateSurvey) ||
    (!!item.eventCreatorToo && !!a.canCreateEvent)
  );
}

// Nama modul untuk pengguna awam, dipakai pesan "akun ini belum memegang modul X". Kunci yang tidak
// dikenal (mis. dari URL yang diketik sembarang) tidak punya nama, jadi tidak pernah dipantulkan ke layar.
const MODULE_LABEL: Record<AdminModule, string> = {
  users: "Pengguna",
  organization: "Organisasi",
  events: "Kegiatan",
  inventory: "Inventaris",
  reports: "Laporan",
  sensus: "Sensus",
  "sensus-ranting": "Sensus Ranting",
  "sensus-verify": "Verifikasi Sensus",
  content: "Konten",
  feedback: "Masukan Pengguna",
  membership: "Rekrutmen",
  forms: "Formulir",
  notifications: "Notifikasi",
  links: "Tautan",
  documents: "Dokumen",
  career: "Lowongan",
};

export function moduleLabel(key: string | undefined): string | null {
  return key && Object.prototype.hasOwnProperty.call(MODULE_LABEL, key) ? MODULE_LABEL[key as AdminModule] : null;
}
