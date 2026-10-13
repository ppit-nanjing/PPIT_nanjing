import type { GuidePhase } from "@/lib/guidebook-topic";

// Daftar topik guidebook maba yang isinya hidup di repo (docs/guidebook/*.md).
// Sumbernya materi PPIT sendiri: buku "A Guide to Nanjing" 2026 dan deck
// sosialisasi Nanjing 101 (lihat docs/Guidebook Maba.md). Script
// src/db/ingest-guide.ts membaca daftar ini; panel merge di /console/docs hanya
// membandingkan hasilnya dengan suntingan pengurus, jadi menambah topik =
// menambah file markdown + satu entri di bawah.
//
// `slug` sengaja yang sudah beredar (mis. transportasi-dari-bandara-ke-kampus)
// supaya tautan /help/<slug> yang pernah dibagikan tetap hidup.

export type GuidebookTopic = {
  slug: string;
  title: string;
  section: string;
  phase: GuidePhase;
  sortOrder: number;
  isPublic: boolean;
  /** Label yang dibaca pengurus di /console/docs untuk tahu asal isinya. */
  sourceLabel: string;
  sourceDocSlug: string;
  /** Jalur relatif dari akar repo. */
  file: string;
  /** Judul/nama bagian untuk halaman publik /help dalam Bahasa Inggris. */
  titleEn: string;
  sectionEn: string;
  /** Berkas terjemahan Inggris; kosong artinya belum ada. */
  fileEn: string;
  /**
   * Isi lama boleh ditimpa walau `content` di DB sudah berisi sesuatu. Dipakai
   * untuk baris yang isinya masih penanda halaman ekstraksi (mis. "[[p12]]").
   */
  replaceStub?: boolean;
};

export const GUIDEBOOK_TOPICS: GuidebookTopic[] = [
  {
    slug: "transportasi-dari-bandara-ke-kampus-uvd9",
    title: "Transportasi dari Bandara ke Kampus",
    section: "Sering Dipakai",
    phase: "arrival",
    sortOrder: 5,
    isPublic: true,
    sourceLabel: "A Guide to Nanjing 2026; Sosialisasi Nanjing 101",
    sourceDocSlug: "guide-to-nanjing-2026",
    file: "docs/guidebook/transportasi-dari-bandara-ke-kampus.md",
    titleEn: "Transport from the Airport to Campus",
    sectionEn: "Frequently Used",
    fileEn: "docs/guidebook/en/transportasi-dari-bandara-ke-kampus.md",
    replaceStub: true,
  },
  {
    slug: "profil-ppit-tiongkok",
    title: "Profil PPIT Tiongkok",
    section: "Tentang PPIT",
    phase: "pre-arrival",
    sortOrder: 9,
    isPublic: true,
    sourceLabel: "A Guide to Nanjing 2026 (Profil PPIT Tiongkok)",
    sourceDocSlug: "guide-to-nanjing-2026",
    file: "docs/guidebook/profil-ppit-tiongkok.md",
    titleEn: "About PPIT Tiongkok",
    sectionEn: "About PPIT",
    fileEn: "docs/guidebook/en/profil-ppit-tiongkok.md",
  },
  {
    slug: "profil-ppit-nanjing",
    title: "Profil PPIT Nanjing",
    section: "Tentang PPIT",
    phase: "pre-arrival",
    sortOrder: 10,
    isPublic: true,
    sourceLabel: "A Guide to Nanjing 2026 (Kata Sambutan & Profil PPIT Nanjing)",
    sourceDocSlug: "guide-to-nanjing-2026",
    file: "docs/guidebook/profil-ppit-nanjing.md",
    titleEn: "About PPIT Nanjing",
    sectionEn: "About PPIT",
    fileEn: "docs/guidebook/en/profil-ppit-nanjing.md",
  },
  {
    slug: "kota-nanjing",
    title: "Kota Nanjing",
    section: "Tentang Nanjing",
    phase: "pre-arrival",
    sortOrder: 20,
    isPublic: true,
    sourceLabel: "A Guide to Nanjing 2026; Sosialisasi Nanjing 101 (Perkenalan Kota Nanjing)",
    sourceDocSlug: "guide-to-nanjing-2026",
    file: "docs/guidebook/kota-nanjing.md",
    titleEn: "The City of Nanjing",
    sectionEn: "About Nanjing",
    fileEn: "docs/guidebook/en/kota-nanjing.md",
  },
  {
    slug: "dokumen-dan-berkas-awal-datang",
    title: "Dokumen dan Berkas Awal Datang",
    section: "Sebelum Berangkat",
    phase: "pre-arrival",
    sortOrder: 30,
    isPublic: true,
    sourceLabel: "A Guide to Nanjing 2026 (paspor, surat keterangan belajar); Sosialisasi Nanjing 101 (Pre-Arrival)",
    sourceDocSlug: "guide-to-nanjing-2026",
    file: "docs/guidebook/dokumen-dan-berkas-awal-datang.md",
    titleEn: "Documents to Bring on Arrival",
    sectionEn: "Before Departure",
    fileEn: "docs/guidebook/en/dokumen-dan-berkas-awal-datang.md",
  },
  {
    slug: "visa-dan-izin-tinggal",
    title: "Visa dan Izin Tinggal",
    section: "Kedatangan",
    phase: "arrival",
    sortOrder: 40,
    isPublic: true,
    sourceLabel: "A Guide to Nanjing 2026 (Imigrasi, Residence Permit); Sosialisasi Nanjing 101 (What to do after arriving)",
    sourceDocSlug: "guide-to-nanjing-2026",
    file: "docs/guidebook/visa-dan-izin-tinggal.md",
    titleEn: "Visa and Residence Permit",
    sectionEn: "Arrival",
    fileEn: "docs/guidebook/en/visa-dan-izin-tinggal.md",
  },
  {
    slug: "aplikasi-pembayaran-dan-sim-card",
    title: "Aplikasi, Pembayaran, dan Kartu SIM",
    section: "Sering Dipakai",
    phase: "first-week",
    sortOrder: 50,
    isPublic: true,
    sourceLabel: "A Guide to Nanjing 2026 (Aplikasi Umum, Sim Card & Internet); China Student Starter Guide VER4 (Part 4)",
    sourceDocSlug: "guide-to-nanjing-2026",
    file: "docs/guidebook/aplikasi-pembayaran-dan-sim-card.md",
    titleEn: "Apps, Payments, and SIM Card",
    sectionEn: "Frequently Used",
    fileEn: "docs/guidebook/en/aplikasi-pembayaran-dan-sim-card.md",
  },
  {
    slug: "tempat-tinggal-asrama-dan-kos",
    title: "Tempat Tinggal: Asrama dan Kos",
    section: "Kedatangan",
    phase: "first-week",
    sortOrder: 60,
    isPublic: true,
    sourceLabel: "China Student Starter Guide VER4 (Part 3)",
    sourceDocSlug: "starter-guide-ver4",
    file: "docs/guidebook/tempat-tinggal-asrama-dan-kos.md",
    titleEn: "Housing: Dormitories and Boarding",
    sectionEn: "Arrival",
    fileEn: "docs/guidebook/en/tempat-tinggal-asrama-dan-kos.md",
  },
  {
    slug: "biaya-hidup-bulan-pertama",
    title: "Biaya Hidup Bulan Pertama",
    section: "Sering Dipakai",
    phase: "first-month",
    sortOrder: 70,
    isPublic: true,
    sourceLabel: "China Student Starter Guide VER4 (Part 5, Part 7)",
    sourceDocSlug: "starter-guide-ver4",
    file: "docs/guidebook/biaya-hidup-bulan-pertama.md",
    titleEn: "First-Month Living Costs",
    sectionEn: "Frequently Used",
    fileEn: "docs/guidebook/en/biaya-hidup-bulan-pertama.md",
  },
];
