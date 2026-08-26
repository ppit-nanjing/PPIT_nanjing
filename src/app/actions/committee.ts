"use server";

import { randomUUID } from "crypto";
import { and, desc, eq, inArray, sql as raw } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { eventCommittee, eventDivisions, certificates, events, users, eventRegistrations } from "@/db/schema";
import { requireModuleAccess } from "@/lib/admin-scope";
import { getStructureTemplate } from "@/lib/event-structure-templates";

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

/**
 * Menugaskan BANYAK orang sekaligus ke satu divisi sebagai anggota - bentuk
 * yang diminta panitia: centang nama-namanya, satu klik beres. Konflik
 * (orang sudah kepanitia di acara ini) berarti PINDAH divisi + jadi anggota,
 * karena satu orang satu baris per acara.
 */
export async function assignMembersToDivision(formData: FormData): Promise<void> {
  await requireModuleAccess("events");
  const eventId = String(formData.get("eventId") ?? "");
  const divisionId = String(formData.get("divisionId") ?? "").trim() || null;
  const userIds = formData.getAll("userId").map((v) => String(v)).filter(Boolean);
  if (!eventId || userIds.length === 0) return;

  await db
    .insert(eventCommittee)
    .values(userIds.map((userId) => ({ eventId, userId, divisionId, role: "anggota" as const })))
    .onConflictDoUpdate({
      target: [eventCommittee.eventId, eventCommittee.userId],
      set: { divisionId, role: "anggota" },
    });

  revalidatePath(`/console/events/${eventId}`);
  revalidatePath("/console/work-ledger");
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

/**
 * Menautkan/mengganti berkas sertifikat SETELAH terbit. PDF-nya memang dibuat
 * di luar aplikasi dan sering baru siap belakangan - tanpa ini, mengisi link
 * berarti menghapus baris lama lalu menerbitkan ulang, yang membuang metadata
 * penerbitan (siapa/kapan) cuma demi mengisi satu URL.
 */
export async function updateCertificateFileUrl(formData: FormData) {
  await requireModuleAccess("events");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("ID sertifikat wajib diisi");

  const [row] = await db
    .update(certificates)
    .set({ fileUrl: String(formData.get("fileUrl") ?? "").trim() || null })
    .where(eq(certificates.id, id))
    .returning({ eventId: certificates.eventId });

  revalidatePath("/console/work-ledger");
  if (row?.eventId) revalidatePath(`/console/events/${row.eventId}`);
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

// Payment verification is gated on "organization" - not the ordinary,
// delegable "events" scope - because it's a financial record, same treatment
// as donation verification (see src/app/actions/donations.ts).
export async function listPendingPayments(eventId?: string) {
  await requireModuleAccess("organization");
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
      eventId: events.id,
      eventTitle: events.title,
    })
    .from(eventRegistrations)
    .leftJoin(users, eq(eventRegistrations.userId, users.id))
    .leftJoin(events, eq(eventRegistrations.eventId, events.id))
    .where(where)
    .orderBy(desc(eventRegistrations.registeredAt));
}

export async function updatePaymentStatus(formData: FormData) {
  const session = await requireModuleAccess("organization");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("paymentStatus") ?? "");
  const allowed = ["not_required", "unpaid", "submitted", "verified", "rejected"];
  if (!allowed.includes(status)) throw new Error("Status pembayaran tidak valid");

  const [row] = await db
    .update(eventRegistrations)
    .set({
      paymentStatus: status as "verified",
      paymentNote: String(formData.get("note") ?? "").trim() || null,
      paymentVerifiedAt: status === "verified" ? new Date() : null,
      paymentVerifiedBy: status === "verified" ? session.user.id : null,
    })
    .where(eq(eventRegistrations.id, id))
    .returning({ eventId: eventRegistrations.eventId, userId: eventRegistrations.userId, regStatus: eventRegistrations.status, qrCodeToken: eventRegistrations.qrCodeToken });

  // PENDAFTARAN BERBAYAR dimulai dari status "pending" TANPA QR (lihat
  // registerForEvent). Verifikasi inilah yang mengangkatnya: jadi "confirmed"
  // dan QR-nya diterbitkan di sini - satu-satunya pintu QR untuk acara
  // berbayar, jadi tidak ada yang check-in sebelum dibuktikan bayar.
  if (status === "verified" && row?.regStatus === "pending") {
    await db
      .update(eventRegistrations)
      .set({ status: "confirmed", qrCodeToken: row.qrCodeToken ?? randomUUID() })
      .where(eq(eventRegistrations.id, id));
  }

  revalidatePath("/console/work-ledger");
  if (row) revalidatePath(`/console/events/${row.eventId}`);
}

/** Peserta melaporkan bukti bayar; verifikasi tetap di tangan bendahara acara. */
export async function submitPaymentProof(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Silakan masuk terlebih dahulu");
  const id = String(formData.get("id") ?? "");
  const proofUrl = String(formData.get("proofUrl") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  if (!proofUrl) throw new Error("Tautan bukti pembayaran wajib diisi");

  await db
    .update(eventRegistrations)
    .set({ paymentProofUrl: proofUrl, paymentStatus: "submitted" })
    // Scoped to the caller's own registration so nobody can mark someone else paid.
    .where(and(eq(eventRegistrations.id, id), eq(eventRegistrations.userId, session.user.id)));

  revalidatePath("/profile/submissions");
  // Caller (the ticket page) already knows its own slug - passed through as a
  // hidden field instead of re-querying it here.
  if (slug) revalidatePath(`/events/${slug}/ticket`);
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

// Menerapkan template struktur kepanitiaan (src/lib/event-structure-templates.ts)
// ke satu acara yang BELUM punya divisi. Sengaja menolak acara yang sudah
// berisi: template menyalin bentuk, bukan menimpa pekerjaan setengah jadi -
// kalau mau ganti, hapus dulu divisinya (picker muncul lagi otomatis).
export async function applyStructureTemplate(formData: FormData) {
  await requireModuleAccess("events");
  const eventId = String(formData.get("eventId") ?? "").trim();
  const template = getStructureTemplate(String(formData.get("templateId") ?? "").trim());
  if (!eventId || !template) throw new Error("Acara dan template wajib dipilih");

  const [event] = await db.select({ id: events.id }).from(events).where(eq(events.id, eventId));
  if (!event) throw new Error("Acara tidak ditemukan");
  const existing = await db
    .select({ id: eventDivisions.id })
    .from(eventDivisions)
    .where(eq(eventDivisions.eventId, eventId))
    .limit(1);
  if (existing.length > 0) {
    throw new Error("Acara ini sudah punya struktur divisi - hapus dulu bila ingin memulai dari template");
  }

  // Departemen dulu supaya sub-timnya punya induk; orderIndex mengikuti urutan
  // dokumen template. Kuota/jobdesc disalin apa adanya - mengosongkan yang
  // tidak diketahui itu disengaja, lihat komentar di registry.
  for (const [i, dept] of template.departments.entries()) {
    const [created] = await db
      .insert(eventDivisions)
      .values({
        eventId,
        parentDivisionId: null,
        name: dept.name,
        quota: dept.quota ?? null,
        jobDescription: dept.jobDescription ?? null,
        orderIndex: i,
      })
      .returning({ id: eventDivisions.id });
    if (dept.children.length === 0) continue;
    await db.insert(eventDivisions).values(
      dept.children.map((child, j) => ({
        eventId,
        parentDivisionId: created.id,
        name: child.name,
        quota: child.quota ?? null,
        jobDescription: child.jobDescription ?? null,
        orderIndex: j,
      })),
    );
  }

  revalidatePath(`/console/events/${eventId}`);
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
 * Menerbitkan sertifikat PESERTA untuk semua pendaftar satu acara sekaligus.
 *
 * Kebalikan dari pola panitia: di sini yang jadi patokan adalah "semua peserta
 * dapat" - pendaftar yang sudah diterima (confirmed maupun attended; pending
 * belum diterima dan cancelled batal) berhak atas sertifikat kehadiran tanpa
 * diketik satu per satu. Yang sudah punya sertifikat peserta untuk acara ini
 * dilewati, jadi tombol aman ditekan ulang setelah ada pendaftar baru.
 *
 * Hanya jalan kalau acara menyalakan flag `certificateForParticipants` -
 * checkbox itu memang saklar ketersediaannya, bukan formalitas.
 */
/**
 * Inti penerbitan sertifikat peserta, dipanggil dari dua tempat: tombol manual
 * di halaman acara DAN otomatis saat acara ditandai "Selesai" (admin-events).
 * Mengembalikan jumlah yang benar-benar diterbitkan supaya pemanggilnya tahu
 * apakah ada yang berubah.
 */
export async function issueParticipantCertificatesCore(eventId: string, actorId: string): Promise<number> {
  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  if (!event || !event.certificateForParticipants) return 0;

  const participants = await db
    .select({ userId: eventRegistrations.userId })
    .from(eventRegistrations)
    .where(
      and(eq(eventRegistrations.eventId, eventId), inArray(eventRegistrations.status, ["confirmed", "attended"]))
    );
  if (participants.length === 0) return 0;

  const existing = await db
    .select({ userId: certificates.userId })
    .from(certificates)
    .where(and(eq(certificates.eventId, eventId), eq(certificates.kind, "peserta")));
  const already = new Set(existing.map((e) => e.userId));

  const toInsert = participants
    .filter((p) => !already.has(p.userId))
    .map((p) => ({
      userId: p.userId,
      eventId,
      kind: "peserta" as const,
      title: `Peserta — ${event.title}`,
      issuedBy: actorId,
    }));

  if (toInsert.length > 0) await db.insert(certificates).values(toInsert);
  return toInsert.length;
}

/** Pembungkus form untuk tombol "Terbitkan Sertifikat Peserta" yang manual. */
export async function issueParticipantCertificates(formData: FormData): Promise<void> {
  const session = await requireModuleAccess("events");
  const eventId = String(formData.get("eventId") ?? "");
  if (!eventId) throw new Error("Acara wajib dipilih");

  await issueParticipantCertificatesCore(eventId, session.user.id);

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
