"use server";

import { randomUUID } from "crypto";
import { and, desc, eq, inArray, sql as raw } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { eventCommittee, eventDivisions, certificates, events, users, eventRegistrations } from "@/db/schema";
import { requireModuleAccess } from "@/lib/admin-scope";
import { requireEventCapability, requireEventConsoleAccess } from "@/lib/event-access";
import { EVENT_COMMITTEE_ROLE_LABEL, GRANTABLE_CAPABILITIES, type EventCommitteeRole } from "@/lib/event-capabilities";
import { logEventAudit } from "@/lib/event-audit";
import { getStructureTemplate } from "@/lib/event-structure-templates";
import { createTemplatedNotification } from "@/lib/notifications";

// Committee membership is per-event on purpose: the treasurer of one event is
// not necessarily the cabinet treasurer, which is the exact complaint in the
// Website Ideas doc. So this never reads from departmentMembers.

const COMMITTEE_ROLE_LABEL = EVENT_COMMITTEE_ROLE_LABEL;

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
  const { session } = await requireEventCapability(eventId, "event.manageCommittee");
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

  // Sertifikat bertaut acara → wewenang event.issueCertificates untuk acara itu.
  // Sertifikat lepas (tanpa acara) tetap butuh modul "events" tingkat kabinet.
  const session = eventId
    ? (await requireEventCapability(eventId, "event.issueCertificates")).session
    : await requireModuleAccess("events");

  await insertCertificates([
    {
      userId,
      eventId,
      kind: (String(formData.get("kind") ?? "peserta")) as "peserta",
      title,
      // A Google Drive link is fine - the ideas doc says so explicitly when
      // storage is tight, and Vercel Blob is not provisioned yet anyway.
      fileUrl: String(formData.get("fileUrl") ?? "").trim() || null,
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

  const [existing] = await db.select({ eventId: certificates.eventId }).from(certificates).where(eq(certificates.id, id));
  if (!existing) throw new Error("Sertifikat tidak ditemukan");
  if (existing.eventId) await requireEventCapability(existing.eventId, "event.issueCertificates");
  else await requireModuleAccess("events");

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
    })
    .from(eventCommittee)
    .leftJoin(users, eq(eventCommittee.userId, users.id))
    .where(eq(eventCommittee.eventId, eventId))
    .orderBy(eventCommittee.role);

  return { divisions, members };
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
    await db.update(eventDivisions).set(values).where(eq(eventDivisions.id, id));
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
  const divisionId = String(formData.get("divisionId") ?? "");
  if (!divisionId) throw new Error("Divisi wajib dipilih");

  const [division] = await db.select().from(eventDivisions).where(eq(eventDivisions.id, divisionId));
  if (!division) throw new Error("Divisi tidak ditemukan");
  const { session } = await requireEventCapability(division.eventId, "event.issueCertificates");
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

  await insertCertificates(toInsert);

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
  const eventId = String(formData.get("eventId") ?? "");
  if (!eventId) throw new Error("Acara wajib dipilih");
  const { session } = await requireEventCapability(eventId, "event.issueCertificates");

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

  await insertCertificates(toInsert);

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

  await insertCertificates(toInsert);
  return toInsert.length;
}

/** Pembungkus form untuk tombol "Terbitkan Sertifikat Peserta" yang manual. */
export async function issueParticipantCertificates(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") ?? "");
  if (!eventId) throw new Error("Acara wajib dipilih");
  const { session } = await requireEventCapability(eventId, "event.issueCertificates");

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
