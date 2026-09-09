import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { events } from "@/db/schema";

// Scanner-nya pindah ke /events/[slug]/scan (di luar /console, supaya Petugas
// Pendataan yang bukan admin kabinet bisa membukanya). Rute lama ini dibiarkan
// sebagai redirect: QR tiket yang sudah tercetak/tersebar masih mengarah ke
// sini.
export default async function LegacyEventScanRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { id } = await params;
  const { t } = await searchParams;
  const [event] = await db.select({ slug: events.slug }).from(events).where(eq(events.id, id));
  if (!event) notFound();
  redirect(`/events/${event.slug}/scan${t ? `?t=${encodeURIComponent(t)}` : ""}`);
}
