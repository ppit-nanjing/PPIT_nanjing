"use server";

import { randomUUID } from "crypto";
import { and, desc, eq, inArray, isNotNull, sql as raw } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { eventCommittee, eventCredits, eventDivisions, certificates, events, users, eventRegistrations, sensusProfiles } from "@/db/schema";
import { requireModuleAccess } from "@/lib/admin-scope";
import { requireEventCapability, requireEventConsoleAccess } from "@/lib/event-access";
import { EVENT_COMMITTEE_ROLE_LABEL, GRANTABLE_CAPABILITIES, type EventCommitteeRole } from "@/lib/event-capabilities";
import { logEventAudit } from "@/lib/event-audit";
import { getStructureTemplate } from "@/lib/event-structure-templates";
import { createTemplatedNotification } from "@/lib/notifications";
import { PRIVATE_FILE_PREFIX, isOwnPrivateFileUrl } from "@/lib/private-files";
import { buildCertificateTitle } from "@/lib/certificate-title";
import { normalizeCertificateUrl, parseCertificateBulk, personKey } from "@/lib/certificate-links";

// Committee membership is per-event on purpose: the treasurer of one event is
// not necessarily the cabinet treasurer, which is the exact complaint in the
// Website Ideas doc. So this never reads from departmentMembers.

const COMMITTEE_ROLE_LABEL = EVENT_COMMITTEE_ROLE_LABEL;

// Terima divisionId HANYA kalau divisi itu memang milik `eventId`. Mencegah
// baris panitia yang divisionId-nya menunjuk divisi acara LAIN — selain data
// yang membingungkan, join di getEventAccess bisa menarik grant divisi asing.
// null (tanpa divisi) selalu lolos.
async function divisionForEvent(divisionId: string | null, eventId: string): Promise<string | null> {
  if (!divisionId) return null;
  const [div] = await db
    .select({ id: eventDivisions.id })
    .from(eventDivisions)
    .where(and(eq(eventDivisions.id, divisionId), eq(eventDivisions.eventId, eventId)));
  if (!div) throw new Error("Divisi tidak valid untuk acara ini");
  return divisionId;
}

// Notifikasi ke peserta yang baru masuk kepanitiaan. Dibungkus catch supaya
// gagalnya notifikasi tidak pernah membatalkan penugasannya.
async function notifyCommitteeAssigned(userId: string, eventId: string, role: string, divisionId: string | null) {
  try {
    const [event] = await db.select({ title: events.title }).from(events).where(eq(events.id, eventId));
    let divisionName = "";
    if (divisionId) {
      const [d] = await db.select({ name: eventDivisions.name }).from(eventDivisions).where(eq(eventDivisions.id, divisionId));
      if (d?.name) divisionName = ` ${d.name}`;
    }
    await createTemplatedNotification({
      userId,
      templateKey: "committee_assigned",
      variables: {
        eventTitle: event?.title ?? "kegiatan",
        roleLabel: COMMITTEE_ROLE_LABEL[role as EventCommitteeRole] ?? role,
        divisionName,
      },
      relatedEntityType: "event",
      relatedEntityId: eventId,
    });
  } catch (err) {
    console.error("[notify] committee_assigned failed:", err);
  }
}

export async function listCommittee(eventId: string) {
  await requireEventConsoleAccess(eventId);
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
  const eventId = String(formData.get("eventId") ?? "");
  const { session } = await requireEventCapability(eventId, "event.manageCommittee");
  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "anggota");
  if (!eventId || !userId) throw new Error("Acara dan pengurus wajib dipilih");

  const assignment = {
    role: role as "anggota",
    note: String(formData.get("note") ?? "").trim() || null,
    // "" dari <select> kosong = panitia inti tanpa divisi, bukan uuid kosong.
    divisionId: await divisionForEvent(String(formData.get("divisionId") ?? "").trim() || null, eventId),
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

  await notifyCommitteeAssigned(userId, eventId, assignment.role, assignment.divisionId);
  await logEventAudit(session.user.id, eventId, "committee.assigned", {
    after: { userId, role: assignment.role, divisionId: assignment.divisionId },
  });

  revalidatePath(`/console/events/${eventId}`);
  revalidatePath("/console/work-ledger");
}

export async function removeCommittee(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const [row] = await db
    .select({ eventId: eventCommittee.eventId, userId: eventCommittee.userId, role: eventCommittee.role })
    .from(eventCommittee)
    .where(eq(eventCommittee.id, id));
  if (!row) return;
  // Mengeluarkan panitia = wewenang BPH Panitia (event.manageCommittee).
  const { session } = await requireEventCapability(row.eventId, "event.manageCommittee");
  await db.delete(eventCommittee).where(eq(eventCommittee.id, id));
  await logEventAudit(session.user.id, row.eventId, "committee.removed", {
    before: { userId: row.userId, role: row.role },
  });
  revalidatePath(`/console/events/${row.eventId}`);
  revalidatePath("/console/work-ledger");
}

/**
 * BPH Kabinet mengambil alih acara yang kepanitiaannya vakum (Spesifikasi §9:
 * "boleh kapan saja tanpa izin"). Mereka sudah punya akses penuh lewat
 * isFullAdmin — aksi ini menjadikannya RESMI & TERCATAT: BPH masuk ke daftar
 * panitia sebagai Supervisory Committee, jadi semua orang tahu BPH turun tangan.
 * Gerbang event.takeOver = hanya "full" (FULL_ADMIN_ONLY, tidak lewat jembatan).
 */
export async function takeOverEvent(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  const { session } = await requireEventCapability(eventId, "event.takeOver");

  await db
    .insert(eventCommittee)
    .values({ eventId, userId: session.user.id, role: "supervisor", note: "Diambil alih BPH" })
    .onConflictDoUpdate({
      target: [eventCommittee.eventId, eventCommittee.userId],
      set: { role: "supervisor", note: "Diambil alih BPH" },
    });

  await logEventAudit(session.user.id, eventId, "event.takeover", { after: { by: session.user.name ?? session.user.id } });
  revalidatePath(`/console/events/${eventId}`);
  revalidatePath("/console/work-ledger");
}

// ---------- Kredit / arsip kepanitiaan (Spesifikasi §10) ----------
// FITUR TERPISAH: baris di sini murni tampilan di halaman acara publik,
// TIDAK memberi akses apa pun. Diisi Sekretaris (event.editCredits, tetap boleh
// walau acara sudah terkunci — LPJ sering belakangan).

export async function addEventCredit(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  if (!eventId) throw new Error("Acara wajib dipilih");
  const { session } = await requireEventCapability(eventId, "event.editCredits");
  const userId = String(formData.get("userId") ?? "").trim() || null;
  const roleLabel = String(formData.get("roleLabel") ?? "").trim() || null;
  let displayName = String(formData.get("displayName") ?? "").trim();

  // Dari picker akun: displayName di-snapshot dari nama akunnya.
  if (userId && !displayName) {
    const [u] = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, userId));
    displayName = u?.name ?? u?.email ?? "";
  }
  if (!displayName) throw new Error("Nama wajib diisi");

  const [{ maxOrder }] = await db
    .select({ maxOrder: raw<number>`coalesce(max(${eventCredits.orderIndex}), 0)` })
    .from(eventCredits)
    .where(eq(eventCredits.eventId, eventId));

  await db.insert(eventCredits).values({ eventId, userId, displayName, roleLabel, orderIndex: Number(maxOrder) + 1 });
  await logEventAudit(session.user.id, eventId, "credit.added", { after: { credit: displayName, roleLabel } });

  revalidatePath(`/console/events/${eventId}`);
  const [ev] = await db.select({ slug: events.slug }).from(events).where(eq(events.id, eventId));
  if (ev?.slug) revalidatePath(`/events/${ev.slug}`);
}

export async function removeEventCredit(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const [row] = await db
    .select({ eventId: eventCredits.eventId, displayName: eventCredits.displayName })
    .from(eventCredits)
    .where(eq(eventCredits.id, id));
  if (!row) return;
  const { session } = await requireEventCapability(row.eventId, "event.editCredits");
  await db.delete(eventCredits).where(eq(eventCredits.id, id));
  await logEventAudit(session.user.id, row.eventId, "credit.removed", { before: { credit: row.displayName } });
  revalidatePath(`/console/events/${row.eventId}`);
  const [ev] = await db.select({ slug: events.slug }).from(events).where(eq(events.id, row.eventId));
  if (ev?.slug) revalidatePath(`/events/${ev.slug}`);
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
  const eventId = String(formData.get("eventId") ?? "");
  if (!eventId) return;
  const { session } = await requireEventCapability(eventId, "event.manageCommittee");
  const divisionId = await divisionForEvent(String(formData.get("divisionId") ?? "").trim() || null, eventId);
  const userIds = formData.getAll("userId").map((v) => String(v)).filter(Boolean);
  if (userIds.length === 0) return;

  await db
    .insert(eventCommittee)
    .values(userIds.map((userId) => ({ eventId, userId, divisionId, role: "anggota" as const })))
    .onConflictDoUpdate({
      target: [eventCommittee.eventId, eventCommittee.userId],
      set: { divisionId, role: "anggota" },
    });

  await Promise.allSettled(userIds.map((userId) => notifyCommitteeAssigned(userId, eventId, "anggota", divisionId)));
  await logEventAudit(session.user.id, eventId, "committee.assigned", { after: { userIds, divisionId, role: "anggota" } });

  revalidatePath(`/console/events/${eventId}`);
  revalidatePath("/console/work-ledger");
}

// ---------- sertifikat ----------

// Menyisipkan baris sertifikat lalu memberi tahu tiap penerimanya. Semua jalur
// penerbitan (satuan, per-divisi, seluruh acara, peserta) lewat sini supaya
// notifikasinya konsisten dan tidak ada yang terlewat.
async function insertCertificates(rows: (typeof certificates.$inferInsert)[]) {
  if (rows.length === 0) return;
  await db.insert(certificates).values(rows);
  await Promise.allSettled(
    rows.map((r) =>
      createTemplatedNotification({
        userId: r.userId,
        templateKey: "certificate_issued",
        variables: { certTitle: r.title },
        relatedEntityType: "certificate",
        relatedEntityId: r.eventId ?? null,
      }),
    ),
  );
  // Satu entri audit per acara (jalur peserta/panitia/divisi bisa mencampur).
  const byEvent = new Map<string, { count: number; issuedBy: string | null }>();
  for (const r of rows) {
    if (!r.eventId) continue;
    const cur = byEvent.get(r.eventId) ?? { count: 0, issuedBy: r.issuedBy ?? null };
    cur.count += 1;
    byEvent.set(r.eventId, cur);
  }
  for (const [eventId, v] of byEvent) {
    await logEventAudit(v.issuedBy, eventId, "certificate.issued", { after: { count: v.count } });
  }
}

export async function issueCertificate(formData: FormData) {
  const userId = String(formData.get("userId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const eventId = String(formData.get("eventId") ?? "") || null;
  if (!userId || !title) throw new Error("Penerima dan judul sertifikat wajib diisi");
  // Sertifikat tidak boleh terbit tanpa tautan berkas, dan tautannya harus https://.
  const fileUrl = normalizeCertificateUrl(String(formData.get("fileUrl") ?? ""));
  if (!fileUrl) throw new Error("Tautan berkas wajib diisi dan harus berupa alamat https://…");

  // Sertifikat bertaut acara → wewenang event.issueCertificates untuk acara itu.
  // Sertifikat lepas (tanpa acara) tetap butuh modul "events" tingkat kabinet.
  const session = eventId
    ? (await requireEventCapability(eventId, "event.issueCertificates")).session
    : await requireModuleAccess("events");

  // Sertifikat peserta/panitia untuk sebuah acara tunduk pada aturan yang sama dengan
  // daftar penerbitan di konsol acara (hadir ter-scan / anggota kepanitiaan); jalur
  // Work Ledger ini tidak boleh jadi celah. Pemateri, juara, dan "lainnya" bebas.
  const kind = String(formData.get("kind") ?? "peserta");
  if (eventId) await assertEligibleForEventCertificate(eventId, userId, kind);

  await insertCertificates([
    {
      userId,
      eventId,
      kind: kind as "peserta",
      title,
      fileUrl,
      issuedBy: session.user.id,
    },
  ]);
  revalidatePath("/console/work-ledger");
  revalidatePath("/profile/submissions");
}

export async function deleteCertificate(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const [row] = await db.select({ eventId: certificates.eventId, title: certificates.title, userId: certificates.userId }).from(certificates).where(eq(certificates.id, id));
  if (!row) return;
  let actorId: string | null = null;
  if (row.eventId) actorId = (await requireEventCapability(row.eventId, "event.issueCertificates")).session.user.id;
  else await requireModuleAccess("events");
  await db.delete(certificates).where(eq(certificates.id, id));
  if (row.eventId) {
    await logEventAudit(actorId, row.eventId, "certificate.deleted", { before: { title: row.title, userId: row.userId } });
  }
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
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("ID sertifikat wajib diisi");

  const [existing] = await db
    .select({ eventId: certificates.eventId, userId: certificates.userId, kind: certificates.kind })
    .from(certificates)
    .where(eq(certificates.id, id));
  if (!existing) throw new Error("Sertifikat tidak ditemukan");
  if (existing.eventId) {
    await requireEventCapability(existing.eventId, "event.issueCertificates");
    // Menempel tautan membuat sertifikat TERBIT, jadi pemiliknya harus berhak. Ini juga
    // menahan sertifikat lama (tanpa berkas) milik orang yang tidak hadir agar tidak
    // ikut terbit hanya karena seseorang mengisi kolom tautannya di Work Ledger.
    await assertEligibleForEventCertificate(existing.eventId, existing.userId, existing.kind);
  } else {
    await requireModuleAccess("events");
  }

  // Tautan tidak boleh dikosongkan: sertifikat tanpa berkas tidak dianggap terbit.
  const fileUrl = normalizeCertificateUrl(String(formData.get("fileUrl") ?? ""));
  if (!fileUrl) throw new Error("Tautan berkas wajib diisi dan harus berupa alamat https://…");

  const [row] = await db
    .update(certificates)
    .set({ fileUrl })
    .where(eq(certificates.id, id))
    .returning({ eventId: certificates.eventId });

  revalidatePath("/console/work-ledger");
  if (row?.eventId) revalidatePath(`/console/events/${row.eventId}`);
  revalidatePath("/profile/submissions");
}

// ---------- penerbitan sertifikat acara: tautan wajib, peserta harus hadir ----------
//
// Dua aturan yang dijaga di sini (server), bukan di tampilan:
//  1. Sertifikat TIDAK terbit tanpa tautan berkas https://. Barisnya baru dibuat
//     saat tautannya ada, jadi tidak pernah ada sertifikat kosong.
//  2. Sertifikat PESERTA hanya untuk yang kehadirannya tercatat (status "attended",
//     artinya QR-nya sudah di-scan). Terkonfirmasi saja tidak cukup. Sertifikat
//     PANITIA untuk anggota kepanitiaan acara itu.

type CertificateKind = "peserta" | "panitia";

type CertificateCandidate = {
  userId: string;
  /** Nama untuk ditampilkan dan dicocokkan: nama lengkap sensus dulu, lalu nama akun. */
  names: string[];
  email: string | null;
  title: string;
};

async function certificateCandidates(event: { id: string; title: string }, kind: CertificateKind): Promise<CertificateCandidate[]> {
  if (kind === "peserta") {
    const rows = await db
      .select({ userId: eventRegistrations.userId, name: users.name, email: users.email, fullName: sensusProfiles.fullName })
      .from(eventRegistrations)
      .innerJoin(users, eq(eventRegistrations.userId, users.id))
      .leftJoin(sensusProfiles, eq(sensusProfiles.userId, eventRegistrations.userId))
      .where(and(eq(eventRegistrations.eventId, event.id), eq(eventRegistrations.status, "attended")));
    return rows.map((r) => ({
      userId: r.userId,
      names: [r.fullName?.trim(), r.name?.trim()].filter((n): n is string => !!n),
      email: r.email,
      title: `Peserta — ${event.title}`,
    }));
  }

  const [members, divisions] = await Promise.all([
    db
      .select({
        userId: eventCommittee.userId,
        role: eventCommittee.role,
        divisionId: eventCommittee.divisionId,
        name: users.name,
        email: users.email,
        fullName: sensusProfiles.fullName,
      })
      .from(eventCommittee)
      .innerJoin(users, eq(eventCommittee.userId, users.id))
      .leftJoin(sensusProfiles, eq(sensusProfiles.userId, eventCommittee.userId))
      .where(eq(eventCommittee.eventId, event.id)),
    db.select({ id: eventDivisions.id, name: eventDivisions.name }).from(eventDivisions).where(eq(eventDivisions.eventId, event.id)),
  ]);
  const divisionNames = new Map(divisions.map((d) => [d.id, d.name]));
  return members.map((m) => ({
    userId: m.userId,
    names: [m.fullName?.trim(), m.name?.trim()].filter((n): n is string => !!n),
    email: m.email,
    title: buildCertificateTitle(m.role, divisionNames.get(m.divisionId ?? "") ?? null, event.title),
  }));
}

/**
 * Kelayakan untuk sertifikat sebuah acara. Hanya jenis "peserta" (harus tercatat hadir)
 * dan "panitia" (harus anggota kepanitiaan acara itu) yang dijaga; pemateri, juara,
 * dan "lainnya" memang bebas karena orangnya bukan peserta/panitia terdaftar.
 */
async function assertEligibleForEventCertificate(eventId: string, userId: string, kind: string): Promise<void> {
  if (kind !== "peserta" && kind !== "panitia") return;
  const [event] = await db.select({ id: events.id, title: events.title }).from(events).where(eq(events.id, eventId));
  if (!event) throw new Error("Acara tidak ditemukan");
  const candidates = await certificateCandidates(event, kind);
  if (!candidates.some((c) => c.userId === userId)) {
    throw new Error(
      kind === "peserta"
        ? "Hanya peserta yang kehadirannya tercatat (QR di-scan) yang berhak atas sertifikat peserta"
        : "Orang ini bukan anggota kepanitiaan acara ini",
    );
  }
}

/**
 * Menulis tautan sertifikat untuk sekumpulan orang yang SUDAH dipastikan berhak.
 * Yang belum punya sertifikat: dibuat (lengkap dengan tautannya) + diberi notifikasi.
 * Yang sudah punya: hanya tautannya yang diperbarui (tanpa notifikasi ulang, tanggal
 * terbit tetap).
 */
async function saveCertificateLinks(
  event: { id: string },
  kind: CertificateKind,
  items: { candidate: CertificateCandidate; url: string }[],
  actorId: string,
): Promise<{ issued: number; updated: number }> {
  const existing = await db
    .select({ id: certificates.id, userId: certificates.userId, fileUrl: certificates.fileUrl })
    .from(certificates)
    .where(and(eq(certificates.eventId, event.id), eq(certificates.kind, kind)));
  const byUser = new Map(existing.map((c) => [c.userId, c]));

  const toInsert: (typeof certificates.$inferInsert)[] = [];
  let updated = 0;
  for (const { candidate, url } of items) {
    const current = byUser.get(candidate.userId);
    if (!current) {
      toInsert.push({ userId: candidate.userId, eventId: event.id, kind, title: candidate.title, fileUrl: url, issuedBy: actorId });
    } else if (current.fileUrl !== url) {
      await db.update(certificates).set({ fileUrl: url }).where(eq(certificates.id, current.id));
      updated += 1;
    }
  }
  await insertCertificates(toInsert); // notifikasi + entri audit "diterbitkan"
  if (updated > 0) await logEventAudit(actorId, event.id, "certificate.link_updated", { after: { count: updated } });
  return { issued: toInsert.length, updated };
}

function revalidateCertificates(eventId: string) {
  revalidatePath(`/console/events/${eventId}`);
  revalidatePath("/console/work-ledger");
  revalidatePath("/profile");
  revalidatePath("/profile/submissions");
}

async function loadCertificateEvent(eventId: string, kind: CertificateKind) {
  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  if (!event) throw new Error("Acara tidak ditemukan");
  if (kind === "peserta" && !event.certificateForParticipants) {
    throw new Error('Acara ini tidak memberi e-sertifikat peserta (kotak "Peserta mendapat e-sertifikat kehadiran" belum dicentang)');
  }
  return event;
}

function parseKind(value: FormDataEntryValue | null): CertificateKind {
  if (value === "peserta" || value === "panitia") return value;
  throw new Error("Jenis sertifikat tidak valid");
}

/** Terbitkan (atau perbarui tautan) sertifikat untuk SATU orang, dengan tautan wajib. */
export async function issueCertificateWithLink(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  const kind = parseKind(formData.get("kind"));
  if (!eventId || !userId) throw new Error("Acara dan penerima wajib diisi");
  const { session } = await requireEventCapability(eventId, "event.issueCertificates");

  const url = normalizeCertificateUrl(String(formData.get("fileUrl") ?? ""));
  if (!url) throw new Error("Tautan berkas wajib diisi dan harus berupa alamat https://…");

  const event = await loadCertificateEvent(eventId, kind);
  const candidate = (await certificateCandidates(event, kind)).find((c) => c.userId === userId);
  if (!candidate) {
    throw new Error(
      kind === "peserta"
        ? "Hanya peserta yang kehadirannya tercatat (QR di-scan) yang berhak atas sertifikat"
        : "Orang ini bukan anggota kepanitiaan acara ini",
    );
  }

  await saveCertificateLinks(event, kind, [{ candidate, url }], session.user.id);
  revalidateCertificates(eventId);
}

export type CertificateBulkState = { done: boolean; issued: number; updated: number; problems: string[] };

const BULK_MAX_LINES = 300;
const BULK_MAX_CHARS = 60_000;

/**
 * Tempel massal: satu orang per baris, "email atau nama lengkap" + tautan. Hanya
 * baris yang cocok dengan satu orang yang berhak yang diproses; sisanya dilaporkan
 * satu per satu (tidak ditemukan / ganda / bukan yang berhak), tidak dibuang diam-diam.
 */
export async function saveCertificateLinksBulk(
  _prev: CertificateBulkState,
  formData: FormData,
): Promise<CertificateBulkState> {
  const eventId = String(formData.get("eventId") ?? "");
  const kind = parseKind(formData.get("kind"));
  if (!eventId) throw new Error("Acara wajib dipilih");
  const { session } = await requireEventCapability(eventId, "event.issueCertificates");

  const text = String(formData.get("lines") ?? "");
  if (text.length > BULK_MAX_CHARS) {
    return { done: true, issued: 0, updated: 0, problems: [`Daftar terlalu panjang (maksimal ${BULK_MAX_CHARS} karakter)`] };
  }
  const { entries, problems } = parseCertificateBulk(text);
  if (entries.length === 0 && problems.length === 0) {
    return { done: true, issued: 0, updated: 0, problems: ["Daftar kosong"] };
  }
  if (entries.length > BULK_MAX_LINES) {
    return { done: true, issued: 0, updated: 0, problems: [`Maksimal ${BULK_MAX_LINES} baris sekali tempel`] };
  }

  const event = await loadCertificateEvent(eventId, kind);
  const candidates = await certificateCandidates(event, kind);

  // email dan nama (lengkap sensus maupun nama akun) -> orang yang berhak.
  const byKey = new Map<string, CertificateCandidate[]>();
  for (const c of candidates) {
    for (const raw of [c.email, ...c.names]) {
      if (!raw) continue;
      const key = personKey(raw);
      const list = byKey.get(key) ?? [];
      if (!list.includes(c)) list.push(c);
      byKey.set(key, list);
    }
  }

  const items: { candidate: CertificateCandidate; url: string }[] = [];
  const seen = new Set<string>();
  const allProblems = [...problems];
  for (const entry of entries) {
    const matches = byKey.get(personKey(entry.key)) ?? [];
    if (matches.length === 0) {
      allProblems.push(
        `Baris ${entry.line} "${entry.key}": tidak ada di daftar yang berhak` +
          (kind === "peserta" ? " (harus tercatat hadir, QR di-scan)" : " (harus anggota kepanitiaan acara ini)"),
      );
      continue;
    }
    if (matches.length > 1) {
      allProblems.push(`Baris ${entry.line} "${entry.key}": cocok dengan lebih dari satu orang, pakai email supaya pasti`);
      continue;
    }
    const candidate = matches[0];
    if (seen.has(candidate.userId)) {
      allProblems.push(`Baris ${entry.line} "${entry.key}": orang ini sudah ada di baris sebelumnya, baris ini dilewati`);
      continue;
    }
    seen.add(candidate.userId);
    items.push({ candidate, url: entry.url });
  }

  const result = items.length > 0 ? await saveCertificateLinks(event, kind, items, session.user.id) : { issued: 0, updated: 0 };
  revalidateCertificates(eventId);
  return { done: true, issued: result.issued, updated: result.updated, problems: allProblems };
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
    // Hanya yang sudah bertautan berkas: sertifikat tanpa berkas belum dianggap terbit
    // (baris lama dari sebelum aturan ini tetap tersimpan tapi tidak ditampilkan).
    .where(and(eq(certificates.userId, session.user.id), isNotNull(certificates.fileUrl)))
    .orderBy(desc(certificates.issuedAt));
}

// ---------- verifikasi pembayaran ----------

// Verifikasi pembayaran = kapabilitas grant "Keuangan" (event.manageFinance)
// untuk divisi yang dicentang BPH Panitia — plus BPH Panitia sendiri & BPH
// Kabinet. Rekap lintas-acara (tanpa eventId) tetap tingkat "organization".
export async function listPendingPayments(eventId?: string) {
  if (eventId) await requireEventCapability(eventId, "event.manageFinance");
  else await requireModuleAccess("organization");
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
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("paymentStatus") ?? "");
  const allowed = ["not_required", "unpaid", "submitted", "verified", "rejected"];
  if (!allowed.includes(status)) throw new Error("Status pembayaran tidak valid");

  const [reg] = await db
    .select({ eventId: eventRegistrations.eventId, before: eventRegistrations.paymentStatus, userId: eventRegistrations.userId })
    .from(eventRegistrations)
    .where(eq(eventRegistrations.id, id));
  if (!reg) throw new Error("Pendaftaran tidak ditemukan");
  const { session } = await requireEventCapability(reg.eventId, "event.manageFinance");

  const auditAction =
    status === "verified"
      ? "payment.verified"
      : status === "rejected"
        ? "payment.rejected"
        : reg.before === "verified"
          ? "payment.unverified"
          : "payment.other";
  await logEventAudit(session.user.id, reg.eventId, auditAction, {
    before: { paymentStatus: reg.before },
    after: { paymentStatus: status, registrationId: id, participantId: reg.userId },
  });

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

  // Beri tahu peserta hasil verifikasinya - selama ini diam-diam.
  if (row?.userId && (status === "verified" || status === "rejected")) {
    try {
      const [event] = await db.select({ title: events.title }).from(events).where(eq(events.id, row.eventId));
      await createTemplatedNotification({
        userId: row.userId,
        templateKey: status === "verified" ? "payment_verified" : "payment_rejected",
        variables: { eventTitle: event?.title ?? "kegiatan" },
        relatedEntityType: "event",
        relatedEntityId: row.eventId,
      });
    } catch (err) {
      console.error("[notify] payment status failed:", err);
    }
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
  // Berkas di store private hanya boleh milik pengirim sendiri, atau berkas
  // yang memang sudah tersimpan di pendaftaran ini (berkas lama hasil migrasi
  // tidak punya segmen pemilik di key-nya, dan form ini mengirim ulang nilainya).
  if (proofUrl.startsWith(PRIVATE_FILE_PREFIX) && !isOwnPrivateFileUrl(proofUrl, "payment-proof", session.user.id)) {
    const [current] = await db
      .select({ id: eventRegistrations.id })
      .from(eventRegistrations)
      .where(
        and(
          eq(eventRegistrations.id, id),
          eq(eventRegistrations.userId, session.user.id),
          eq(eventRegistrations.paymentProofUrl, proofUrl),
        ),
      );
    if (!current) throw new Error("Berkas bukti pembayaran tidak valid, unggah ulang");
  }

  const [updated] = await db
    .update(eventRegistrations)
    .set({ paymentProofUrl: proofUrl, paymentStatus: "submitted" })
    // Scoped to the caller's own registration so nobody can mark someone else paid.
    .where(and(eq(eventRegistrations.id, id), eq(eventRegistrations.userId, session.user.id)))
    .returning({ eventId: eventRegistrations.eventId });

  if (updated) {
    try {
      const [event] = await db.select({ title: events.title }).from(events).where(eq(events.id, updated.eventId));
      await createTemplatedNotification({
        userId: session.user.id,
        templateKey: "payment_proof_submitted",
        variables: { eventTitle: event?.title ?? "kegiatan" },
        relatedEntityType: "event",
        relatedEntityId: updated.eventId,
      });
    } catch (err) {
      console.error("[notify] payment_proof_submitted failed:", err);
    }
  }

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
  await requireEventConsoleAccess(eventId);
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
      checkedInAt: eventCommittee.checkedInAt,
      checkedInBy: eventCommittee.checkedInBy,
    })
    .from(eventCommittee)
    .leftJoin(users, eq(eventCommittee.userId, users.id))
    .where(eq(eventCommittee.eventId, eventId))
    .orderBy(eventCommittee.role);

  // Nama petugas yang men-scan tiap panitia (checked_in_by) — satu lookup.
  const scannerIds = [
    ...new Set(members.map((m) => m.checkedInBy).filter((v): v is string => !!v)),
  ];
  const scannerNames = scannerIds.length
    ? new Map(
        (await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, scannerIds))).map(
          (u) => [u.id, u.name] as const,
        ),
      )
    : new Map<string, string | null>();

  return {
    divisions,
    members: members.map(({ checkedInBy, checkedInAt, ...m }) => ({
      ...m,
      checkedInAt: checkedInAt ? checkedInAt.toISOString() : null,
      checkedInByName: checkedInBy ? scannerNames.get(checkedInBy) ?? null : null,
    })),
  };
}

export async function saveEventDivision(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!eventId || !name) throw new Error("Acara dan nama divisi wajib diisi");
  await requireEventCapability(eventId, "event.manageCommittee");

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
    // id + eventId bersama: meng-POST id divisi acara lain = no-op, bukan
    // pembajakan.
    await db.update(eventDivisions).set(values).where(and(eq(eventDivisions.id, id), eq(eventDivisions.eventId, eventId)));
  } else {
    await db.insert(eventDivisions).values(values);
  }

  revalidatePath(`/console/events/${eventId}`);
}

export async function deleteEventDivision(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const [row] = await db.select({ eventId: eventDivisions.eventId, name: eventDivisions.name }).from(eventDivisions).where(eq(eventDivisions.id, id));
  if (!row) return;
  const { session } = await requireEventCapability(row.eventId, "event.manageCommittee");
  // Sub-tim ikut terhapus (cascade), tapi panitianya tidak - kolom division_id
  // mereka jadi NULL, jadi catatan kepanitiaannya tetap utuh.
  await db.delete(eventDivisions).where(eq(eventDivisions.id, id));
  await logEventAudit(session.user.id, row.eventId, "committee.removed", { before: { division: row.name } });
  revalidatePath(`/console/events/${row.eventId}`);
  revalidatePath("/console/work-ledger");
}

/**
 * BPH Panitia mencentang kapabilitas khusus untuk sebuah divisi acara —
 * sertifikat, galeri, keuangan, pinjam aset, post artikel, scan. Semua anggota
 * divisi itu lalu ikut mendapatkannya (lihat src/lib/event-access.ts).
 */
export async function updateDivisionGrants(formData: FormData) {
  const divisionId = String(formData.get("divisionId") ?? "");
  const [division] = await db
    .select({ eventId: eventDivisions.eventId, name: eventDivisions.name, before: eventDivisions.grantedCapabilities })
    .from(eventDivisions)
    .where(eq(eventDivisions.id, divisionId));
  if (!division) throw new Error("Divisi tidak ditemukan");
  const { session } = await requireEventCapability(division.eventId, "event.manageCommittee");

  const allowed = new Set<string>(GRANTABLE_CAPABILITIES.map((g) => g.key));
  const granted = formData.getAll("capability").map((v) => String(v)).filter((k) => allowed.has(k));

  await db.update(eventDivisions).set({ grantedCapabilities: granted }).where(eq(eventDivisions.id, divisionId));
  await logEventAudit(session.user.id, division.eventId, "division.grants", {
    before: { division: division.name, capabilities: division.before },
    after: { division: division.name, capabilities: granted },
  });
  revalidatePath(`/console/events/${division.eventId}`);
}

// Menerapkan template struktur kepanitiaan (src/lib/event-structure-templates.ts)
// ke satu acara yang BELUM punya divisi. Sengaja menolak acara yang sudah
// berisi: template menyalin bentuk, bukan menimpa pekerjaan setengah jadi -
// kalau mau ganti, hapus dulu divisinya (picker muncul lagi otomatis).
export async function applyStructureTemplate(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "").trim();
  const template = getStructureTemplate(String(formData.get("templateId") ?? "").trim());
  if (!eventId || !template) throw new Error("Acara dan template wajib dipilih");
  const { session } = await requireEventCapability(eventId, "event.manageCommittee");

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

  // Satu db.batch() = satu transaksi HTTP Neon (`client.transaction`): seluruh
  // pohon masuk atau tidak sama sekali. Ini bukan cuma soal jaringan - kalau
  // insert boleh gagal di tengah, sisa struktur setengah jadi justru memblokir
  // retry lewat guard "sudah punya divisi" di atas.
  //
  // Sub-tim merujuk induknya lewat subquery nama, bukan hasil .returning(),
  // supaya semua statement bisa disusun di depan dalam satu batch - driver
  // neon-http tidak mendukung transaction interaktif. Aman karena nama
  // departemen unik per template dan guard kekosongan menjamin tabel acara ini
  // masih kosong. Sisa celah kecil: dua apply yang benar-benar bersamaan bisa
  // lolos cek awal sama-sama; menutupnya butuh unique index
  // (event_id, parent_division_id, name) - ditunda sampai ada kasus nyata.
  const rootInsert = db.insert(eventDivisions).values(
    template.departments.map((dept, i) => ({
      eventId,
      parentDivisionId: null,
      name: dept.name,
      quota: dept.quota ?? null,
      jobDescription: dept.jobDescription ?? null,
      orderIndex: i,
    })),
  );
  // orderIndex anak mengikuti urutan dokumen template per induknya. Kuota/
  // jobdesc disalin apa adanya - mengosongkan yang tidak diketahui itu
  // disengaja, lihat komentar di registry.
  const childRows = template.departments.flatMap((dept) =>
    dept.children.map((child, j) => ({
      eventId,
      parentDivisionId: raw<string>`(select id from "event_divisions" where "event_id" = ${eventId} and "name" = ${dept.name} and "parent_division_id" is null)`,
      name: child.name,
      quota: child.quota ?? null,
      jobDescription: child.jobDescription ?? null,
      orderIndex: j,
    })),
  );
  await db.batch(childRows.length > 0 ? [rootInsert, db.insert(eventDivisions).values(childRows)] : [rootInsert]);
  await logEventAudit(session.user.id, eventId, "committee.assigned", {
    after: { template: template.label, divisions: template.departments.length },
  });

  revalidatePath(`/console/events/${eventId}`);
}
