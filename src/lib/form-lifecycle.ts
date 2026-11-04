import { and, isNotNull, isNull, sql } from "drizzle-orm";
import { forms } from "@/db/schema";

// Daur hidup Formulir Kustom (migrasi 0058): aktif, Arsip (selesai, ditutup, hasil tetap terbuka), atau
// Sampah (soft delete, terkunci untuk semua orang sampai dipulihkan). Pemilu dan Oprek tidak memakainya
// (kolomnya ada di tabel forms tetapi selalu NULL untuk jenis itu). Satu sumber untuk filter daftar dan
// kolom tambahan di query daftar.

export type FormLifecycle = "active" | "archived" | "trashed";

export function lifecycleFilter(state: FormLifecycle) {
  if (state === "active") return and(isNull(forms.deletedAt), isNull(forms.archivedAt));
  if (state === "archived") return and(isNull(forms.deletedAt), isNotNull(forms.archivedAt));
  return isNotNull(forms.deletedAt);
}

/** Kolom yang dibutuhkan bagian Arsip/Sampah; ditambahkan ke select daftar. */
export const formLifecycleColumns = {
  archivedAt: forms.archivedAt,
  deletedAt: forms.deletedAt,
  deletedByName: sql<string | null>`(select u.name from users u where u.id = ${forms.deletedBy})`,
};
