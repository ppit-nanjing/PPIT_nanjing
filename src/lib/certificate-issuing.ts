import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  certificates,
  eventCommittee,
  eventDivisions,
  eventEvaluations,
  eventRegistrations,
  events,
  sensusProfiles,
  users,
} from "@/db/schema";
import { buildCertificateTitle } from "@/lib/certificate-title";
import { normalizeCertificateUrl } from "@/lib/certificate-links";
import { logEventAudit } from "@/lib/event-audit";
import { createTemplatedNotification } from "@/lib/notifications";

// Penerbitan sertifikat acara — dipakai Server Action konsol (committee.ts) DAN
// pengiriman evaluasi peserta (event-evaluations.ts), jadi tinggal di lib, bukan
// di file "use server" (helper di sana tidak bisa diimpor).
//
// Aturan yang dijaga di server, bukan di tampilan:
//  1. Sertifikat TIDAK terbit tanpa tautan berkas https://.
//  2. Sertifikat PESERTA hanya untuk yang (a) kehadirannya tercatat — status
//     "attended", artinya QR-nya di-scan — DAN (b) sudah mengisi evaluasi acara
//     itu sambil masuk ke akunnya (event_evaluations.user_id). Evaluasi tanpa
//     akun tidak bisa dicocokkan ke orangnya, jadi tidak dihitung.
//  3. Sertifikat PANITIA untuk anggota kepanitiaan acara itu.

export type CertificateKind = "peserta" | "panitia";

export type CertificateCandidate = {
  userId: string;
  /** Nama untuk ditampilkan dan dicocokkan: nama lengkap sensus dulu, lalu nama akun. */
  names: string[];
  email: string | null;
  title: string;
};

/** Menyisipkan baris sertifikat lalu memberi tahu tiap penerimanya + satu entri audit per acara. */
export async function insertCertificates(rows: (typeof certificates.$inferInsert)[]) {
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

// Peserta yang sudah mengisi evaluasi acara ini dengan akunnya.
function hasLinkedEvaluation() {
  return sql`exists (
    select 1 from ${eventEvaluations} ev
    where ev.event_id = ${eventRegistrations.eventId}
      and ev.user_id = ${eventRegistrations.userId}
      and ev.audience = 'peserta'
  )`;
}

/** Daftar orang yang BERHAK atas sertifikat jenis ini (lihat aturan di atas). */
export async function certificateCandidates(
  event: { id: string; title: string },
  kind: CertificateKind,
): Promise<CertificateCandidate[]> {
  if (kind === "peserta") {
    const rows = await db
      .select({ userId: eventRegistrations.userId, name: users.name, email: users.email, fullName: sensusProfiles.fullName })
      .from(eventRegistrations)
      .innerJoin(users, eq(eventRegistrations.userId, users.id))
      .leftJoin(sensusProfiles, eq(sensusProfiles.userId, eventRegistrations.userId))
      .where(
        and(
          eq(eventRegistrations.eventId, event.id),
          eq(eventRegistrations.status, "attended"),
          hasLinkedEvaluation(),
        ),
      );
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
 * Menulis tautan sertifikat untuk sekumpulan orang yang SUDAH dipastikan berhak.
 * Yang belum punya sertifikat: dibuat (lengkap dengan tautannya) + diberi notifikasi.
 * Yang sudah punya: hanya tautannya yang diperbarui (tanpa notifikasi ulang, tanggal
 * terbit tetap) — kecuali `onlyMissing`, yang tidak menyentuh sertifikat yang sudah ada.
 */
export async function saveCertificateLinks(
  event: { id: string },
  kind: CertificateKind,
  items: { candidate: CertificateCandidate; url: string }[],
  actorId: string | null,
  opts: { onlyMissing?: boolean } = {},
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
    } else if (!opts.onlyMissing && current.fileUrl !== url) {
      await db.update(certificates).set({ fileUrl: url }).where(eq(certificates.id, current.id));
      updated += 1;
    }
  }
  await insertCertificates(toInsert); // notifikasi + entri audit "diterbitkan"
  if (updated > 0) await logEventAudit(actorId, event.id, "certificate.link_updated", { after: { count: updated } });
  return { issued: toInsert.length, updated };
}

/**
 * Terbitkan sertifikat dengan tautan FOLDER acara ke semua yang berhak tapi
 * BELUM punya sertifikat. Dipanggil otomatis saat folder disimpan, jadi panitia
 * cukup menyimpan folder. Sertifikat yang sudah ada (mis. tautan per orang)
 * tidak diubah. Tanpa folder tersimpan: tidak melakukan apa-apa.
 */
export async function issueFolderCertificatesToMissing(
  eventId: string,
  kind: CertificateKind,
  actorId: string | null,
): Promise<{ issued: number }> {
  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  if (!event) return { issued: 0 };
  if (kind === "peserta" && !event.certificateForParticipants) return { issued: 0 };
  const folderUrl = normalizeCertificateUrl(
    (kind === "peserta" ? event.certificateFolderPesertaUrl : event.certificateFolderPanitiaUrl) ?? "",
  );
  if (!folderUrl) return { issued: 0 };
  const candidates = await certificateCandidates(event, kind);
  if (candidates.length === 0) return { issued: 0 };
  const { issued } = await saveCertificateLinks(
    event,
    kind,
    candidates.map((candidate) => ({ candidate, url: folderUrl })),
    actorId,
    { onlyMissing: true },
  );
  return { issued };
}

/**
 * Dipanggil setelah peserta mengirim evaluasi dengan akunnya: kalau ia tercatat
 * hadir dan folder sertifikat peserta sudah disimpan, sertifikatnya terbit saat
 * itu juga (beserta notifikasi). Mengembalikan true bila sertifikat baru terbit.
 */
export async function issueParticipantCertificateIfEligible(eventId: string, userId: string): Promise<boolean> {
  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  if (!event || !event.certificateForParticipants) return false;
  const folderUrl = normalizeCertificateUrl(event.certificateFolderPesertaUrl ?? "");
  if (!folderUrl) return false;
  const candidate = (await certificateCandidates(event, "peserta")).find((c) => c.userId === userId);
  if (!candidate) return false;
  const { issued } = await saveCertificateLinks(event, "peserta", [{ candidate, url: folderUrl }], null, {
    onlyMissing: true,
  });
  return issued > 0;
}
