"use server";

import { and, desc, eq, inArray, sql as raw } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { eventCommittee, eventDivisions, certificates, events, users, eventRegistrations } from "@/db/schema";
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

  const assignment = {
    role: role as "anggota",
    note: String(formData.get("note") ?? "").trim() || null,
    // "" dari <select> kosong = panitia inti tanpa divisi, bukan uuid kosong.
    divisionId: String(formData.get("divisionId") ?? "").trim() || null,
  };

  // One row per person per event: re-assigning changes their role instead of
  // stacking duplicates (the unique index would reject a second insert anyway).
  await db
    .insert(eventCommittee)
    .values({ eventId, userId, ...assignment })
    .onConflictDoUpdate({
      target: [eventCommittee.eventId, eventCommittee.userId],
      set: assignment,
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

// ---------------------------------------------------------------------------
// Struktur kepanitiaan per acara (Departemen → sub-tim)
// ---------------------------------------------------------------------------

/** Seluruh divisi satu acara, induk lebih dulu, beserta jumlah anggotanya. */
export async function listEventDivisions(eventId: string) {
  await requireModuleAccess("events");
  const divisions = await db
    .select()
    .from(eventDivisions)
    .where(eq(eventDivisions.eventId, eventId))
    .orderBy(eventDivisions.orderIndex, eventDivisions.name);

  const members = await db
    .select({
      id: eventCommittee.id,
      divisionId: eventCommittee.divisionId,
      role: eventCommittee.role,
      note: eventCommittee.note,
      userId: users.id,
      name: users.name,
      email: users.email,
    })
    .from(eventCommittee)
    .leftJoin(users, eq(eventCommittee.userId, users.id))
    .where(eq(eventCommittee.eventId, eventId))
    .orderBy(eventCommittee.role);

  return { divisions, members };
}

export async function saveEventDivision(formData: FormData) {
  await requireModuleAccess("events");
  const eventId = String(formData.get("eventId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!eventId || !name) throw new Error("Acara dan nama divisi wajib diisi");

  const quotaRaw = String(formData.get("quota") ?? "").trim();
  const values = {
    eventId,
    // "" dari <select> kosong berarti divisi tingkat atas, bukan string kosong
    // yang akan ditolak sebagai uuid tidak valid.
    parentDivisionId: String(formData.get("parentDivisionId") ?? "").trim() || null,
    name,
    quota: quotaRaw ? Number(quotaRaw) : null,
    jobDescription: String(formData.get("jobDescription") ?? "").trim() || null,
    orderIndex: Number(String(formData.get("orderIndex") ?? "0")) || 0,
  };

  const id = String(formData.get("id") ?? "").trim();
  if (id) {
    // Divisi tidak boleh jadi induk dirinya sendiri - itu bikin pohonnya
    // memutar dan halaman strukturnya tidak akan pernah selesai dirender.
    if (values.parentDivisionId === id) throw new Error("Divisi tidak bisa menjadi induk dirinya sendiri");
    await db.update(eventDivisions).set(values).where(eq(eventDivisions.id, id));
  } else {
    await db.insert(eventDivisions).values(values);
  }

  revalidatePath(`/console/events/${eventId}`);
}

export async function deleteEventDivision(formData: FormData) {
  await requireModuleAccess("events");
  const id = String(formData.get("id") ?? "");
  const [row] = await db.select({ eventId: eventDivisions.eventId }).from(eventDivisions).where(eq(eventDivisions.id, id));
  // Sub-tim ikut terhapus (cascade), tapi panitianya tidak - kolom division_id
  // mereka jadi NULL, jadi catatan kepanitiaannya tetap utuh.
  await db.delete(eventDivisions).where(eq(eventDivisions.id, id));
  if (row) revalidatePath(`/console/events/${row.eventId}`);
  revalidatePath("/console/work-ledger");
}

/**
 * Menerbitkan sertifikat panitia untuk semua anggota satu divisi sekaligus,
 * termasuk sub-timnya. Judulnya dirakit dari peran + nama divisi + nama acara,
 * jadi "Ketua Departemen Perlengkapan — WIF 2026" tidak perlu diketik satu per
 * satu untuk tiap orang.
 *
 * Berkas PDF-nya tetap ditautkan manual belakangan: tidak ada generator PDF di
 * proyek ini, dan menerbitkan baris sertifikat tanpa berkas masih berguna -
 * anggota bisa melihat perannya tercatat, pengurus tinggal menambah tautannya.
 *
 * Tidak mengembalikan hitungan "N terbit / N dilewati": dipakai langsung sebagai
 * <form action>, yang hanya menerima void. Umpan baliknya dibuat permanen saja -
 * halaman strukturnya menandai siapa yang sudah bersertifikat, jadi hasilnya
 * masih terbaca setelah halaman di-reload, bukan pesan sekilas yang hilang.
 */
export async function issueDivisionCertificates(formData: FormData): Promise<void> {
  const session = await requireModuleAccess("events");
  const divisionId = String(formData.get("divisionId") ?? "");
  if (!divisionId) throw new Error("Divisi wajib dipilih");

  const [division] = await db.select().from(eventDivisions).where(eq(eventDivisions.id, divisionId));
  if (!division) throw new Error("Divisi tidak ditemukan");
  const [event] = await db.select().from(events).where(eq(events.id, division.eventId));

  const children = await db
    .select({ id: eventDivisions.id })
    .from(eventDivisions)
    .where(eq(eventDivisions.parentDivisionId, divisionId));
  const scope = [divisionId, ...children.map((c) => c.id)];

  const members = await db
    .select({ userId: eventCommittee.userId, role: eventCommittee.role, divisionId: eventCommittee.divisionId })
    .from(eventCommittee)
    .where(and(eq(eventCommittee.eventId, division.eventId), inArray(eventCommittee.divisionId, scope)));

  if (members.length === 0) return;

  // Sertifikat panitia yang sudah ada untuk acara ini, supaya menekan tombolnya
  // dua kali tidak menggandakan sertifikat orang yang sama.
  const existing = await db
    .select({ userId: certificates.userId })
    .from(certificates)
    .where(and(eq(certificates.eventId, division.eventId), eq(certificates.kind, "panitia")));
  const already = new Set(existing.map((e) => e.userId));

  const divisionNames = new Map(
    (await db.select().from(eventDivisions).where(eq(eventDivisions.eventId, division.eventId))).map((d) => [d.id, d.name])
  );

  const toInsert = members
    .filter((m) => !already.has(m.userId))
    .map((m) => {
      const unitName = divisionNames.get(m.divisionId ?? "") ?? division.name;
      return {
        userId: m.userId,
        eventId: division.eventId,
        kind: "panitia" as const,
        title: buildCertificateTitle(m.role, unitName, event?.title ?? null),
        issuedBy: session.user.id,
      };
    });

  if (toInsert.length > 0) await db.insert(certificates).values(toInsert);

  revalidatePath(`/console/events/${division.eventId}`);
  revalidatePath("/console/work-ledger");
  revalidatePath("/profile/submissions");
}

/**
 * Menerbitkan sertifikat panitia untuk SELURUH panitia acara, termasuk yang
 * tidak berada di divisi mana pun.
 *
 * Tombol per-divisi tidak cukup: BPH + SC (Supervisory Committee, Ketua
 * Pelaksana, Wakil, Bendahara, Sekretaris) memang berdiri di luar divisi mana
 * pun, jadi mereka tidak akan pernah terjangkau kalau penerbitannya hanya bisa
 * lewat divisi — padahal setiap peran di kepanitiaan berhak atas sertifikatnya.
 *
 * Sama seperti versi per-divisi: yang sudah punya sertifikat panitia untuk acara
 * ini dilewati, jadi menekan tombolnya setelah menambah orang baru hanya
 * menerbitkan untuk yang baru itu.
 */
export async function issueEventCertificates(formData: FormData): Promise<void> {
  const session = await requireModuleAccess("events");
  const eventId = String(formData.get("eventId") ?? "");
  if (!eventId) throw new Error("Acara wajib dipilih");

  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  const members = await db
    .select({ userId: eventCommittee.userId, role: eventCommittee.role, divisionId: eventCommittee.divisionId })
    .from(eventCommittee)
    .where(eq(eventCommittee.eventId, eventId));
  if (members.length === 0) return;

  const existing = await db
    .select({ userId: certificates.userId })
    .from(certificates)
    .where(and(eq(certificates.eventId, eventId), eq(certificates.kind, "panitia")));
  const already = new Set(existing.map((e) => e.userId));

  const divisionNames = new Map(
    (await db.select().from(eventDivisions).where(eq(eventDivisions.eventId, eventId))).map((d) => [d.id, d.name])
  );

  const toInsert = members
    .filter((m) => !already.has(m.userId))
    .map((m) => ({
      userId: m.userId,
      eventId,
      kind: "panitia" as const,
      title: buildCertificateTitle(m.role, divisionNames.get(m.divisionId ?? "") ?? null, event?.title ?? null),
      issuedBy: session.user.id,
    }));

  if (toInsert.length > 0) await db.insert(certificates).values(toInsert);

  revalidatePath(`/console/events/${eventId}`);
  revalidatePath("/console/work-ledger");
  revalidatePath("/profile/submissions");
}

/**
 * Merakit judul sertifikat dari peran + unit + acara.
 *
 * Tanpa divisi, peran berdiri sendiri sebagai jabatan tingkat acara: "ketua"
 * jadi Ketua Pelaksana, bukan "Ketua " menggantung tanpa nama unit. Itu yang
 * membuat BPH + SC terbaca benar.
 */
function buildCertificateTitle(role: string, unitName: string | null, eventTitle: string | null): string {
  const TOP_LEVEL: Record<string, string> = {
    ketua: "Ketua Pelaksana",
    wakil: "Wakil Ketua Pelaksana",
    supervisor: "Supervisory Committee",
    sekretaris: "Sekretaris",
    bendahara: "Bendahara",
    anggota: "Panitia",
  };
  const label = unitName
    ? role === "anggota"
      ? `Anggota ${unitName}`
      : `${titleCase(role)} ${unitName}`
    : TOP_LEVEL[role] ?? titleCase(role);
  return eventTitle ? `${label} — ${eventTitle}` : label;
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
