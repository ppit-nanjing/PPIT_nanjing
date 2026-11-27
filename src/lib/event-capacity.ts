import { and, count, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { eventFeeOptions, eventRegistrations } from "@/db/schema";

// Kapasitas acara punya dua lapis:
//
//  1. events.capacity — pagu total pendaftaran online (boleh null = tak dibatasi).
//  2. event_fee_options.quota — pagu per kategori tarif (mis. WIF: Freshmen 130,
//     Non-freshmen 20). Begitu satu kategori penuh, hanya kategori itu yang
//     tertutup; kategori lain jalan terus.
//
// Keduanya dihitung dari baris pendaftaran yang belum dibatalkan. Perhitungan
// ulang setiap kali dibaca (bukan kolom counter) — cocok untuk skala acara PPIT
// dan tak bisa melenceng. Sisa kursi antara jumlah kuota kategori dan
// events.capacity (mis. jatah panitia / peserta On The Spot) sengaja tidak
// dimodelkan di sini: itu diurus panitia di luar portal.

export type FeeOptionSeats = {
  id: string;
  label: string;
  amountCny: number;
  earlyBirdAmountCny: number | null;
  quota: number | null;
  registered: number;
  // Kuota kategori ini habis. Selalu false kalau kategori tak punya kuota.
  isFull: boolean;
  // Sisa kursi kategori ini; null = kategori tak punya kuota.
  remaining: number | null;
  // Batas pendaftaran kategori ini (null = ikut batas acara) dan apakah sudah lewat.
  registrationDeadline: Date | null;
  isClosed: boolean;
};

export type EventSeats = {
  // Total pendaftaran (di luar yang dibatalkan).
  registered: number;
  capacity: number | null;
  // events.capacity tercapai.
  capacityFull: boolean;
  feeOptions: FeeOptionSeats[];
  // Ada minimal satu kategori tarif yang dibatasi kuota.
  hasQuotas: boolean;
  // Tidak ada kategori yang masih bisa dipilih karena sebagian sudah lewat batas
  // waktunya dan sisanya penuh. Diperlakukan seperti batas pendaftaran lewat.
  allOptionsClosed: boolean;
  // Pendaftaran online harus ditutup:
  //  - events.capacity tercapai, ATAU
  //  - SETIAP kategori tarif punya kuota dan semuanya penuh. (Kalau ada satu
  //    kategori tanpa kuota, kategori itu masih menampung — tak pernah "penuh".)
  isFull: boolean;
};

const notCancelled = () => ne(eventRegistrations.status, "cancelled");

export type CategorySeats = { label: string; quota: number | null; registered: number };

// Kursi per kategori tarif untuk banyak acara sekaligus (konsol). Hanya acara yang
// punya minimal satu kategori berkuota (mis. NYALA: Offline 100, Online tanpa batas):
// di acara seperti itu "terdaftar / capacity" menyesatkan, jadi konsol memecahnya
// per kategori seperti halaman publik. Aturan hitungnya sama dengan getEventSeats().
export async function getCategorySeatsByEvent(eventIds: string[]): Promise<Map<string, CategorySeats[]>> {
  const result = new Map<string, CategorySeats[]>();
  if (eventIds.length === 0) return result;
  const rows = await db
    .select({
      eventId: eventFeeOptions.eventId,
      label: eventFeeOptions.label,
      quota: eventFeeOptions.quota,
      registered: sql<number>`count(${eventRegistrations.id})::int`,
    })
    .from(eventFeeOptions)
    .leftJoin(eventRegistrations, and(eq(eventRegistrations.feeOptionId, eventFeeOptions.id), notCancelled()))
    .where(inArray(eventFeeOptions.eventId, eventIds))
    .groupBy(eventFeeOptions.id)
    .orderBy(eventFeeOptions.orderIndex, eventFeeOptions.id);
  for (const { eventId, ...seat } of rows) {
    result.set(eventId, [...(result.get(eventId) ?? []), seat]);
  }
  for (const [id, seats] of result) if (!seats.some((s) => s.quota != null)) result.delete(id);
  return result;
}

export async function getEventSeats(event: {
  id: string;
  capacity: number | null;
}): Promise<EventSeats> {
  const [{ value: registered }] = await db
    .select({ value: count() })
    .from(eventRegistrations)
    .where(and(eq(eventRegistrations.eventId, event.id), notCancelled()));

  const options = await db
    .select({
      id: eventFeeOptions.id,
      label: eventFeeOptions.label,
      amountCny: eventFeeOptions.amountCny,
      earlyBirdAmountCny: eventFeeOptions.earlyBirdAmountCny,
      quota: eventFeeOptions.quota,
      registrationDeadline: eventFeeOptions.registrationDeadline,
    })
    .from(eventFeeOptions)
    .where(eq(eventFeeOptions.eventId, event.id))
    .orderBy(eventFeeOptions.orderIndex, eventFeeOptions.id);

  const perOption = new Map<string, number>();
  if (options.length > 0) {
    const rows = await db
      .select({ feeOptionId: eventRegistrations.feeOptionId, value: count() })
      .from(eventRegistrations)
      .where(and(eq(eventRegistrations.eventId, event.id), notCancelled()))
      .groupBy(eventRegistrations.feeOptionId);
    for (const r of rows) {
      if (r.feeOptionId) perOption.set(r.feeOptionId, Number(r.value));
    }
  }

  const now = new Date();
  const feeOptions: FeeOptionSeats[] = options.map((o) => {
    const reg = perOption.get(o.id) ?? 0;
    return {
      id: o.id,
      label: o.label,
      amountCny: o.amountCny,
      earlyBirdAmountCny: o.earlyBirdAmountCny,
      quota: o.quota,
      registered: reg,
      isFull: o.quota != null && reg >= o.quota,
      remaining: o.quota != null ? Math.max(0, o.quota - reg) : null,
      registrationDeadline: o.registrationDeadline,
      isClosed: o.registrationDeadline != null && o.registrationDeadline < now,
    };
  });

  const capacityFull = event.capacity != null && Number(registered) >= event.capacity;
  const hasQuotas = feeOptions.some((o) => o.quota != null);
  const quotaFull =
    feeOptions.length > 0 && feeOptions.every((o) => o.quota != null && o.isFull);

  return {
    registered: Number(registered),
    capacity: event.capacity,
    capacityFull,
    feeOptions,
    hasQuotas,
    allOptionsClosed:
      feeOptions.length > 0 && feeOptions.some((o) => o.isClosed) && feeOptions.every((o) => o.isClosed || o.isFull),
    isFull: capacityFull || quotaFull,
  };
}
