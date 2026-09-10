// Tarif acara bertahap: early bird -> normal.
//
// `events.earlyBirdUntil` menandai batas tahap early bird. Peserta yang mendaftar
// pada/sebelum titik itu kena tarif early bird kategorinya
// (`event_fee_options.earlyBirdAmountCny`); setelahnya tarif normal (`amountCny`).
//
// Tier TIDAK disimpan di baris pendaftaran — dihitung dari `registeredAt` vs
// `earlyBirdUntil` setiap kali dibutuhkan. Konsekuensinya: mengubah
// `earlyBirdUntil` ikut menggeser tarif orang yang sudah daftar. Itu disengaja,
// sejalan dengan pola "nominal dibaca live, bisa dikoreksi panitia sebelum
// dibayar" di seluruh modul acara.
//
// Murni (tanpa "use server"/DB) supaya bisa dipakai di server maupun client.

export type FeeTier = "early_bird" | "normal";

/**
 * Tier yang berlaku pada waktu `at` (default: sekarang).
 * `null` = acara tidak memasang tahap early bird sama sekali.
 */
export function feeTierAt(
  earlyBirdUntil: Date | string | null | undefined,
  at: Date = new Date(),
): FeeTier | null {
  if (!earlyBirdUntil) return null;
  const cutoff = earlyBirdUntil instanceof Date ? earlyBirdUntil : new Date(earlyBirdUntil);
  if (Number.isNaN(cutoff.getTime())) return null;
  return at.getTime() <= cutoff.getTime() ? "early_bird" : "normal";
}

/**
 * Nominal efektif satu kategori tarif (atau tarif tunggal) untuk `tier` tsb.
 * Tier "early_bird" tanpa nominal early bird -> jatuh ke nominal normal.
 * Mengembalikan `null` kalau nominal normalnya sendiri tidak ada.
 */
export function amountForTier(
  tier: FeeTier | null,
  normalAmount: number | null | undefined,
  earlyBirdAmount: number | null | undefined,
): number | null {
  if (tier === "early_bird" && earlyBirdAmount != null) return earlyBirdAmount;
  return normalAmount ?? null;
}

/** Apakah kategori ini benar-benar menawarkan diskon early bird yang lebih murah. */
export function hasEarlyBirdDiscount(
  amountCny: number | null | undefined,
  earlyBirdAmountCny: number | null | undefined,
): boolean {
  return earlyBirdAmountCny != null && (amountCny == null || earlyBirdAmountCny < amountCny);
}
