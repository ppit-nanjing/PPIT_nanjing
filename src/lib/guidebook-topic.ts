import { sql } from "drizzle-orm";
import { helpArticles } from "@/db/schema";

// Topik guidebook maba = baris help_articles yang `phase`-nya terisi
// (docs/Guidebook Maba.md fase P2). Daftar fase, labelnya, dan ekspresi
// tanda-tangan artikel cuma ditulis di sini supaya halaman editor, daftar topik,
// dan Server Action-nya tidak bisa berbeda diam-diam.

export const GUIDE_PHASES = [
  { value: "pre-arrival", label: "Sebelum Berangkat" },
  { value: "arrival", label: "Kedatangan" },
  { value: "first-week", label: "Minggu Pertama" },
  { value: "first-month", label: "Bulan Pertama" },
] as const;

export type GuidePhase = (typeof GUIDE_PHASES)[number]["value"];

export function isGuidePhase(value: string): value is GuidePhase {
  return GUIDE_PHASES.some((p) => p.value === value);
}

export function guidePhaseLabel(value: string | null): string {
  if (!value) return "Belum masuk fase";
  return GUIDE_PHASES.find((p) => p.value === value)?.label ?? value;
}

export type ExpiryStatus = "none" | "ok" | "soon" | "expired";

/**
 * Status masa berlaku sebuah topik. Ditaruh di sini, bukan di dalam komponennya,
 * karena `Date.now()` tidak boleh dipanggil saat render (aturan purity React) -
 * dan dua halaman konsol harus memakai ambang hari yang sama.
 */
export function expiryStatus(expiresAt: Date | null, withinDays = 30): ExpiryStatus {
  if (!expiresAt) return "none";
  const daysLeft = (expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
  if (daysLeft < 0) return "expired";
  if (daysLeft < withinDays) return "soon";
  return "ok";
}

/**
 * Tanda tangan isi artikel (judul + bagian + isi), dihitung Postgres. Dipakai
 * sebagai kunci optimistis saat menyimpan: form membawa nilai lama sebagai
 * hidden field, dan WHERE-nya cuma cocok selama isinya belum berubah.
 * Dihitung di satu tempat supaya halaman dan action tidak membandingkan dua
 * perhitungan yang berbeda. Tidak memakai `updated_at` karena presisi
 * mikrodetik kolom timestamp bikin perbandingan lewat JavaScript rapuh.
 */
export const articleSignatureSql = sql<string>`md5(
  coalesce(${helpArticles.title}, '') || '|' ||
  coalesce(${helpArticles.section}, '') || '|' ||
  coalesce(${helpArticles.content}, '')
)`;
