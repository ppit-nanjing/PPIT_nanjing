// Ranting = sub-cabang setingkat kampus di bawah PPIT Nanjing. Sejak Opsi B
// (2026-11) datanya TABEL `rantings` di database (drizzle/0058-...) - BUKAN
//* hardcode lagi. Menambah ranting (mis. Taizhou) = INSERT satu baris data;
// kode atau deploy baru tidak diperlukan.
//
// Pemetaan ranting -> kampus dibuat lewat nilai `university` yang tersimpan di
// sensus_profiles, dicocokkan persis (case-insensitive, di-trim) dengan daftar
// `rantings.universities` - nilainya berasal dari dropdown per-cabang
// (src/db/seed-branch-universities.ts). Mahasiswa yang memakai opsi bebas
// "Lainnya" atau alias pendek ("NUIST") tidak akan terhitung; itu keterbatasan
// yang diterima, bukan bug.
//
// Hanya untuk server (butuh db). Client yang butuh daftar ranting harus
// menerima datanya sebagai props polos dari Server Component.
import { cache } from "react";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { rantings } from "@/db/schema";

// Kode ranting unik ("INA", "JIA", dst - uppercase). Dikembangkan dari
// literal "INA" | "JIA" karena daftar ranting kini data, bukan union TS.
export type RantingCode = string;

// Satu baris ranting, serializable - aman dikirim ke Client Components.
export interface RantingData {
  id: string;
  code: string;
  label: string;
  universities: string[];
  wechatId: string | null;
}

// cache() dedupes antar panggilan dalam satu render server (sensus success,
// halaman konsol ranting, dsb. bisa memanggil lebih dari sekali).
export const getRantings = cache(async (): Promise<RantingData[]> => {
  const rows = await db
    .select({
      id: rantings.id,
      code: rantings.code,
      label: rantings.label,
      universities: rantings.universities,
      wechatId: rantings.wechatId,
    })
    .from(rantings)
    .where(eq(rantings.isActive, true))
    .orderBy(asc(rantings.orderIndex), asc(rantings.code));
  return rows;
});

export function isRantingCode(value: string | null | undefined, list: RantingData[]): boolean {
  return !!value && list.some((r) => r.code === value);
}

export function findRanting(code: string | null | undefined, list: RantingData[]): RantingData | undefined {
  return list.find((r) => r.code === code);
}

// Cocokkan nilai `university` sensus dengan daftar kampus sebuah ranting.
export function universityInRanting(
  university: string | null | undefined,
  ranting: RantingData,
): boolean {
  const u = (university ?? "").trim().toLowerCase();
  if (!u) return false;
  return ranting.universities.some((name) => name.toLowerCase().trim() === u);
}

// Kebalikan universityInRanting: dari kampus, cari kode rantingnya (kalau
// ada). Dipakai di /sensus/success untuk menampilkan kartu grup WeChat
// ranting tambahan, di samping kartu grup utama PPIT Nanjing yang sudah ada.
export function rantingCodeFromUniversity(university: string | null | undefined, list: RantingData[]): string | null {
  for (const r of list) {
    if (universityInRanting(university, r)) return r.code;
  }
  return null;
}
