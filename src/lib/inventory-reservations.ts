import { and, eq, gte, lte, asc } from "drizzle-orm";
import { db } from "@/db";
import { itemReservations } from "@/db/schema";

export type ReservationRow = typeof itemReservations.$inferSelect;

/**
 * Reservasi AKTIF sebuah aset yang rentang tanggalnya beririsan dengan
 * [from, to] (dua string tanggal `YYYY-MM-DD`). Irisan: reservasi mulai
 * sebelum/tepat `to` DAN berakhir setelah/tepat `from`.
 */
export async function overlappingReservations(
  itemId: string,
  from: string,
  to: string,
): Promise<ReservationRow[]> {
  return db
    .select()
    .from(itemReservations)
    .where(
      and(
        eq(itemReservations.itemId, itemId),
        eq(itemReservations.status, "active"),
        lte(itemReservations.reservedFrom, to),
        gte(itemReservations.reservedTo, from),
      ),
    )
    .orderBy(asc(itemReservations.reservedFrom));
}

/** Semua reservasi aktif sebuah aset yang belum lewat (untuk ditampilkan di halaman aset). */
export async function upcomingReservations(itemId: string): Promise<ReservationRow[]> {
  const today = new Date().toISOString().slice(0, 10);
  return db
    .select()
    .from(itemReservations)
    .where(
      and(
        eq(itemReservations.itemId, itemId),
        eq(itemReservations.status, "active"),
        gte(itemReservations.reservedTo, today),
      ),
    )
    .orderBy(asc(itemReservations.reservedFrom));
}
