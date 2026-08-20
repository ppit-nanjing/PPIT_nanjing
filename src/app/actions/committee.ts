"use server";

import { and, desc, eq, sql as raw } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { eventCommittee, certificates, events, users, eventRegistrations } from "@/db/schema";
import { requireModuleAccess } from "@/lib/admin-scope";

// Committee membership is per-event on purpose: the treasurer of one event is
// not necessarily the cabinet treasurer, which is the exact complaint in the
// Website Ideas doc. So this never reads from departmentMembers.

export async function listCommittee(eventId: string) {
  await requireModuleAccess("events");
  return db
    .select({
      id: eventCommittee.id,
      role: eventCommittee.role,
      note: eventCommittee.note,
      assignedAt: eventCommittee.assignedAt,
      userId: users.id,
      name: users.name,
      email: users.email,
    })
    .from(eventCommittee)
    .leftJoin(users, eq(eventCommittee.userId, users.id))
    .where(eq(eventCommittee.eventId, eventId))
    .orderBy(eventCommittee.role);
}

export async function assignCommittee(formData: FormData) {
  await requireModuleAccess("events");
  const eventId = String(formData.get("eventId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "anggota");
  if (!eventId || !userId) throw new Error("Acara dan pengurus wajib dipilih");

  // One row per person per event: re-assigning changes their role instead of
  // stacking duplicates (the unique index would reject a second insert anyway).
  await db
    .insert(eventCommittee)
    .values({ eventId, userId, role: role as "anggota", note: String(formData.get("note") ?? "").trim() || null })
    .onConflictDoUpdate({
      target: [eventCommittee.eventId, eventCommittee.userId],
      set: { role: role as "anggota", note: String(formData.get("note") ?? "").trim() || null },
    });

  revalidatePath(`/console/events/${eventId}`);
  revalidatePath("/console/work-ledger");
}

export async function removeCommittee(formData: FormData) {
  await requireModuleAccess("events");
  const id = String(formData.get("id") ?? "");
  const [row] = await db.select({ eventId: eventCommittee.eventId }).from(eventCommittee).where(eq(eventCommittee.id, id));
  await db.delete(eventCommittee).where(eq(eventCommittee.id, id));
  if (row) revalidatePath(`/console/events/${row.eventId}`);
  revalidatePath("/console/work-ledger");
}

/**
 * The work ledger BPH actually asked for: one row per person with how many
 * committees they sit on, so nobody quietly ends up on eight at once.
 */
export async function getWorkLedger() {
  await requireModuleAccess("events");
  const rows = await db
    .select({
      assignmentId: eventCommittee.id,
      userId: users.id,
      name: users.name,
      email: users.email,
      eventId: events.id,
      eventTitle: events.title,
      eventStartAt: events.startAt,
      role: eventCommittee.role,
      note: eventCommittee.note,
    })
    .from(eventCommittee)
    .leftJoin(users, eq(eventCommittee.userId, users.id))
    .leftJoin(events, eq(eventCommittee.eventId, events.id))
    .orderBy(desc(events.startAt));

  const byPerson = new Map<string, { name: string; email: string; assignments: typeof rows }>();
  for (const r of rows) {
    if (!r.userId) continue;
    const cur = byPerson.get(r.userId) ?? { name: r.name ?? "(tanpa nama)", email: r.email ?? "", assignments: [] };
    cur.assignments = [...cur.assignments, r];
    byPerson.set(r.userId, cur);
  }
  // Busiest first - that is the whole point of the ledger.
  return [...byPerson.entries()]
    .map(([userId, v]) => ({ userId, ...v }))
    .sort((a, b) => b.assignments.length - a.assignments.length);
}

// ---------- sertifikat ----------

export async function issueCertificate(formData: FormData) {
  const session = await requireModuleAccess("events");
  const userId = String(formData.get("userId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!userId || !title) throw new Error("Penerima dan judul sertifikat wajib diisi");

  await db.insert(certificates).values({
    userId,
    eventId: String(formData.get("eventId") ?? "") || null,
    kind: (String(formData.get("kind") ?? "peserta")) as "peserta",
    title,
    // A Google Drive link is fine - the ideas doc says so explicitly when
    // storage is tight, and Vercel Blob is not provisioned yet anyway.
    fileUrl: String(formData.get("fileUrl") ?? "").trim() || null,
    issuedBy: session.user.id,
  });
  revalidatePath("/console/work-ledger");
  revalidatePath("/profile/submissions");
}

export async function deleteCertificate(formData: FormData) {
  await requireModuleAccess("events");
  await db.delete(certificates).where(eq(certificates.id, String(formData.get("id") ?? "")));
  revalidatePath("/console/work-ledger");
  revalidatePath("/profile/submissions");
}

/** Certificates belong to the signed-in user; no admin scope needed. */
export async function getMyCertificates() {
  const session = await auth();
  if (!session?.user?.id) return [];
  return db
    .select({
      id: certificates.id,
      kind: certificates.kind,
      title: certificates.title,
      fileUrl: certificates.fileUrl,
      issuedAt: certificates.issuedAt,
      eventTitle: events.title,
      eventSlug: events.slug,
    })
    .from(certificates)
    .leftJoin(events, eq(certificates.eventId, events.id))
    .where(eq(certificates.userId, session.user.id))
    .orderBy(desc(certificates.issuedAt));
}

// ---------- verifikasi pembayaran ----------

export async function listPendingPayments(eventId?: string) {
  await requireModuleAccess("events");
  const where = eventId
    ? and(eq(eventRegistrations.eventId, eventId), raw`${eventRegistrations.paymentStatus} <> 'not_required'`)
    : raw`${eventRegistrations.paymentStatus} <> 'not_required'`;
  return db
    .select({
      id: eventRegistrations.id,
      status: eventRegistrations.paymentStatus,
      proofUrl: eventRegistrations.paymentProofUrl,
      note: eventRegistrations.paymentNote,
      registeredAt: eventRegistrations.registeredAt,
      name: users.name,
      email: users.email,
      eventTitle: events.title,
    })
    .from(eventRegistrations)
    .leftJoin(users, eq(eventRegistrations.userId, users.id))
    .leftJoin(events, eq(eventRegistrations.eventId, events.id))
    .where(where)
    .orderBy(desc(eventRegistrations.registeredAt));
}

export async function updatePaymentStatus(formData: FormData) {
  const session = await requireModuleAccess("events");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("paymentStatus") ?? "");
  const allowed = ["not_required", "unpaid", "submitted", "verified", "rejected"];
  if (!allowed.includes(status)) throw new Error("Status pembayaran tidak valid");

  await db
    .update(eventRegistrations)
    .set({
      paymentStatus: status as "verified",
      paymentNote: String(formData.get("note") ?? "").trim() || null,
      paymentVerifiedAt: status === "verified" ? new Date() : null,
      paymentVerifiedBy: status === "verified" ? session.user.id : null,
    })
    .where(eq(eventRegistrations.id, id));

  revalidatePath("/console/work-ledger");
}

/** Peserta melaporkan bukti bayar; verifikasi tetap di tangan bendahara acara. */
export async function submitPaymentProof(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Silakan masuk terlebih dahulu");
  const id = String(formData.get("id") ?? "");
  const proofUrl = String(formData.get("proofUrl") ?? "").trim();
  if (!proofUrl) throw new Error("Tautan bukti pembayaran wajib diisi");

  await db
    .update(eventRegistrations)
    .set({ paymentProofUrl: proofUrl, paymentStatus: "submitted" })
    // Scoped to the caller's own registration so nobody can mark someone else paid.
    .where(and(eq(eventRegistrations.id, id), eq(eventRegistrations.userId, session.user.id)));

  revalidatePath("/profile/submissions");
}
