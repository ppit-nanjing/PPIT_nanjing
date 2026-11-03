import { hasModuleAccess } from "@/lib/admin-scope-constants";
import { NAV_GROUPS, canSeeNavItem, type NavAccess } from "@/lib/console-nav";

// Isi kartu "Mulai dari sini" di dashboard konsol: untuk pengurus yang baru dilantik dan
// belum pernah menerima serah terima lisan. Murni fungsi dari akses akun (tanpa query), jadi
// ikut aman dipakai di halaman yang sengaja tidak membaca data apa pun.

export const START_HIDDEN_COOKIE = "console_start_hidden";

export type StartStep = { title: string; why: string; href: string; cta: string };
export type StartModule = { label: string; hint: string; href: string };

export function buildStartGuide(a: NavAccess): { modules: StartModule[]; steps: StartStep[] } {
  const modules = NAV_GROUPS.flatMap((g) => g.items)
    .filter((i) => i.href !== "/console" && canSeeNavItem(i, a))
    .map((i) => ({ label: i.label, hint: i.hint, href: i.href }));

  const has = (m: Parameters<typeof hasModuleAccess>[1]) => hasModuleAccess(a.scope, m);

  // Tugas pertama yang paling berguna lebih dulu; hanya dua teratas yang tampil, supaya
  // orang yang memegang banyak modul tidak disodori daftar panjang.
  const tasks: StartStep[] = [];
  if (has("events")) {
    tasks.push({
      title: "Buka kegiatan yang jadi tanggung jawabmu",
      why: "Bagian yang butuh tindakan, seperti volunteer yang menunggu, terbuka otomatis.",
      href: "/console/events",
      cta: "Buka Kegiatan",
    });
  } else if (a.isCommittee) {
    tasks.push({
      title: "Buka acara tempat kamu jadi panitia",
      why: "Kamu hanya melihat acara yang kamu ikuti. Yang bisa kamu kerjakan di dalamnya mengikuti peranmu di kepanitiaan.",
      href: "/console/events",
      cta: "Buka Kegiatan",
    });
  }
  if (has("inventory")) {
    tasks.push({
      title: "Periksa pengajuan peminjaman yang menunggu",
      why: "Setujui atau tolak (menolak wajib menulis alasan), lalu catat saat barang dikembalikan.",
      href: "/console/inventory",
      cta: "Buka Inventaris",
    });
  }
  if (has("membership")) {
    tasks.push({
      title: "Tinjau lamaran rekrutmen yang masuk",
      why: "Putuskan diterima atau ditolak. Pelamar mendapat pemberitahuan otomatis.",
      href: "/console/membership",
      cta: "Buka Rekrutmen",
    });
  }
  if (has("sensus") || has("sensus-verify")) {
    tasks.push({
      title: "Periksa sensus yang perlu diverifikasi",
      why: "Cocokkan nama, kampus, dan kartu mahasiswa. Data pribadi hanya dipakai untuk pemeriksaan ini.",
      href: "/console/sensus",
      cta: "Buka Sensus",
    });
  }
  if (has("content")) {
    tasks.push({
      title: "Tulis berita pertamamu sebagai draf",
      why: "Simpan sebagai draf dulu. Berita baru tampil di situs, dan emailnya terkirim, setelah kamu mempublikasikannya.",
      href: "/console/content/news/new",
      cta: "Tulis Berita",
    });
  }
  if (has("feedback")) {
    tasks.push({
      title: "Baca masukan terbaru dari pengguna",
      why: "Kritik dan laporan masalah dari pengguna situs. Tandai yang sudah ditangani.",
      href: "/console/feedback",
      cta: "Buka Masukan",
    });
  }
  if (has("forms") || a.isBphCommittee || a.isCoordinator) {
    tasks.push({
      title: "Lihat formulir yang sedang berjalan",
      why: "Pemilu dan Oprek (pendaftaran pengisi posisi) untuk divisi atau kepanitiaan.",
      href: "/console/forms",
      cta: "Buka Formulir",
    });
  }
  if (has("users")) {
    tasks.push({
      title: "Cek daftar pengguna dan divisinya",
      why: "Perubahan divisi atau status baru berlaku setelah kamu menekan Terapkan, jadi aman untuk dicoba.",
      href: "/console/users",
      cta: "Buka Pengguna",
    });
  }
  if (a.canCreateSurvey) {
    tasks.push({
      title: "Buat formulir sendiri untuk survei atau pendataan",
      why: "Judul dan pertanyaan bebas. Hasilnya tampil sebagai grafik dan bisa diunduh atau dibuka di Google Sheets.",
      href: "/formulir",
      cta: "Buka Formulir Kustom",
    });
  }

  const steps = [
    ...tasks.slice(0, 2),
    {
      title: "Kenali panduan di setiap halaman",
      why: "Tombol Panduan di pojok kanan atas halaman menjelaskan halaman itu. Dokumentasi memuat semua modul.",
      href: "/console/docs",
      cta: "Buka Dokumentasi",
    },
  ];
  return { modules, steps };
}
