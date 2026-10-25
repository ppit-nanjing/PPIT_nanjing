import type { Session } from "next-auth";
import { cache } from "react";
import { redirect } from "next/navigation";
import { and, eq, isNull, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { departmentMembers, eventCommittee, eventDivisions, eventResponsibleDepartments, events } from "@/db/schema";
import { hasModuleAccess } from "@/lib/admin-scope";
import {
  type EventCapability,
  type EventCommitteeRole,
  BRIDGE_EXCLUDED_CAPABILITIES,
  LOCK_EXEMPT_CAPABILITIES,
  hasEventCapability,
  isBphPanitiaRole,
  isCommitteeLocked,
} from "@/lib/event-capabilities";
import { UUID_RE } from "@/lib/uuid";

// Server-only enforcement for the per-event committee model. Same shape as
// admin-scope.ts: a resolver + a require() wrapper that redirects. Client
// components import from event-capabilities.ts instead - this file pulls in
// @/auth and @/db.

// Kini SPESIFIK per acara (sejak acara punya Divisi Penanggung Jawab): pemegang
// scope modul "events" yang bukan full admin hanya tembus acara yang DIA buat
// atau yang divisinya tercatat sebagai Divisi Penanggung Jawab acara itu (tabel
// event_responsible_departments). Acara tanpa baris PJ hanya terlihat full
// admin (+ pembuatnya). Kepanitiaan tetap memberi akses per-acara di atasnya.
// EVENT_RBAC_STRICT=true mematikan jembatan modul sepenuhnya (hanya full admin
// + panitia acara) — jaring pengaman kalau scope "events" ingin dihapus.
export const EVENT_RBAC_STRICT = false;

export type EventAccess = {
  session: Session | null;
  // Peran orang ini di kepanitiaan acara ybs, atau null kalau bukan panitia.
  role: EventCommitteeRole | null;
  // true kalau `role` termasuk jabatan BPH Panitia (ketua/wakil/sekretaris/bendahara/SC).
  isBphPanitia: boolean;
  // BPH Kabinet: adminScope "full" + setiap anggota Divisi Teknologi.
  isFullAdmin: boolean;
  // Acara ada di Sampah (events.deleted_at terisi). Semua akses lain ditolak —
  // termasuk BPH Kabinet: acara di Sampah dikelola dari /console/events
  // (pulihkan / hapus permanen), bukan dari halaman acaranya.
  trashed: boolean;
  // Jembatan modul yang sudah di-scope: scope "events" + (pembuat acara ATAU
  // divisinya jadi PJ acara ini), selama EVENT_RBAC_STRICT masih false.
  // Full admin selalu true (tidak terpengaruh scoping).
  moduleBridge: boolean;
  // Kapabilitas yang dicentang untuk divisi orang ini (subset GRANTABLE_*).
  divisionGrants: string[];
  // Acara sudah >2 minggu pasca-selesai: panitia hanya bisa BACA, ubah lewat
  // BPH Kabinet. `false` untuk full admin (mereka tetap bisa mengubah).
  locked: boolean;
  can: (capability: EventCapability) => boolean;
};

const DENIED: EventAccess = {
  session: null,
  role: null,
  isBphPanitia: false,
  isFullAdmin: false,
  trashed: false,
  moduleBridge: false,
  divisionGrants: [],
  locked: false,
  can: () => false,
};

// cache() dedupes within one server render — the console event page resolves
// access several times (page gate + listEventDivisions + section helpers).
// Outside a render (server actions) cache() is a passthrough, so behaviour there
// is unchanged.
export const getEventAccess = cache(async function getEventAccess(
  eventId: string,
): Promise<EventAccess> {
  const session = await auth();
  if (!session?.user?.id) return DENIED;

  const isFullAdmin = session.user.adminScope === "full";
  const hasEventsModule = hasModuleAccess(session.user.adminScope ?? null, "events");
  // Pemegang modul non-full harus lewat scope per-acara (pembuat / divisi PJ).
  const needScopedBridge = !EVENT_RBAC_STRICT && hasEventsModule && !isFullAdmin;

  // Peran + grant divisi orang ini untuk acara ini. Indeks unik
  // (event_id, user_id) menjamin paling banyak satu baris. Di-query untuk full
  // admin juga - pemanggil memakai `role` di UI dan biayanya satu lookup.
  // eventId non-UUID (mis. FormData kosong) tidak di-query - Postgres akan
  // melempar sintaks uuid; anggap saja "bukan panitia".
  let role: EventCommitteeRole | null = null;
  let divisionGrants: string[] = [];
  let locked = false;
  let trashed = false;
  let scopedBridge: boolean | null = null;

  // "Pemakai ini anggota divisi PJ acara ini?" — satu ekspresi SQL yang sama
  // dipakai di dua tempat (bukan panitia & panitia-yang-juga-pemegang-modul).
  const pjMatchExpr = sql<boolean>`exists (
    select 1
    from ${eventResponsibleDepartments} erd
    join ${departmentMembers} dm on dm.department_id = erd.department_id
    where erd.event_id = ${eventId} and dm.user_id = ${session.user.id}
  )`;

  if (UUID_RE.test(eventId)) {
    const [row] = await db
      .select({
        role: eventCommittee.role,
        divisionGrants: eventDivisions.grantedCapabilities,
        status: events.status,
        startAt: events.startAt,
        endAt: events.endAt,
        deletedAt: events.deletedAt,
      })
      .from(eventCommittee)
      // divisi HARUS milik acara yang sama — kalau tidak, baris panitia yang
      // divisionId-nya (karena bug / input jahil) menunjuk divisi acara LAIN
      // bisa menarik grant divisi itu ke acara ini. Cocokkan eventId juga.
      .leftJoin(
        eventDivisions,
        and(
          eq(eventCommittee.divisionId, eventDivisions.id),
          eq(eventDivisions.eventId, eventCommittee.eventId),
        ),
      )
      // Kolom acara di-join dari eventCommittee.eventId yang selalu = eventId,
      // jadi bila orang ini bukan panitia kita perlu lookup acara terpisah.
      .innerJoin(events, eq(events.id, eventCommittee.eventId))
      .where(and(eq(eventCommittee.eventId, eventId), eq(eventCommittee.userId, session.user.id)))
      .limit(1);
    if (row) {
      role = (row.role as EventCommitteeRole | undefined) ?? null;
      divisionGrants = row.divisionGrants ?? [];
      locked = isCommitteeLocked({ status: row.status, startAt: row.startAt, endAt: row.endAt });
      trashed = row.deletedAt != null;
    } else {
      // Bukan panitia (BPH Kabinet / pemegang modul) — tetap perlu tahu status
      // kunci, apakah acaranya di Sampah, dan (untuk scoping) pembuat & PJ.
      const [ev] = await db
        .select({
          status: events.status,
          startAt: events.startAt,
          endAt: events.endAt,
          deletedAt: events.deletedAt,
          createdBy: events.createdBy,
          pjMatch: pjMatchExpr,
        })
        .from(events)
        .where(eq(events.id, eventId));
      if (ev) {
        if (!isFullAdmin) locked = isCommitteeLocked(ev);
        trashed = ev.deletedAt != null;
        if (needScopedBridge) {
          scopedBridge = ev.createdBy === session.user.id || ev.pjMatch === true;
        }
      }
    }
  }

  // Acara di Sampah: tolak semua kapabilitas untuk siapa pun. Sesi tetap
  // dikembalikan supaya pemanggil membedakan "belum login" dari "ditolak".
  if (trashed) return { ...DENIED, session, trashed: true };

  // Panitia yang JUGA pemegang modul: jembatannya tetap dibatasi scope yang
  // sama (kepanitiaan memberinya kapabilitas peran sendiri, bukan akses buta).
  if (needScopedBridge && scopedBridge === null && UUID_RE.test(eventId)) {
    const [m] = await db
      .select({ createdBy: events.createdBy, pjMatch: pjMatchExpr })
      .from(events)
      .where(eq(events.id, eventId));
    if (m) scopedBridge = m.createdBy === session.user.id || m.pjMatch === true;
  }

  const moduleBridge = !EVENT_RBAC_STRICT && hasEventsModule && (isFullAdmin || scopedBridge === true);

  return {
    session,
    role,
    isBphPanitia: isBphPanitiaRole(role),
    isFullAdmin,
    trashed: false,
    moduleBridge,
    divisionGrants,
    locked,
    can: (capability) => {
      if (isFullAdmin) return true;
      // Acara terkunci: panitia (& moduleBridge) hanya boleh kapabilitas BACA.
      if (locked && !LOCK_EXEMPT_CAPABILITIES.includes(capability)) return false;
      return (
        (moduleBridge && !BRIDGE_EXCLUDED_CAPABILITIES.includes(capability)) ||
        hasEventCapability(role, capability, divisionGrants)
      );
    },
  };
});

/**
 * Daftar id acara yang boleh diakses pemegang modul "events" non-full admin:
 * acara yang dia buat ∪ acara yang divisinya jadi Divisi Penanggung Jawab ∪
 * acara tempat dia panitia. `null` = tanpa batas (full admin) — pemanggil
 * memakai ini untuk daftar Kegiatan & Work Ledger supaya tidak query per-acara
 * (hindari N+1).
 *
 * Catatan: baris Divisi PJ hanya MENYEMPITKAN akses pemegang modul; baris itu
 * TIDAK memberi modul "Kegiatan" ke divisi yang belum dicentang di Organisasi.
 */
export const getScopedEventIds = cache(async function getScopedEventIds(): Promise<string[] | null> {
  const session = await auth();
  if (!session?.user?.id) return [];
  if (session.user.adminScope === "full") return null;
  const userId = session.user.id;
  const [createdRows, pjRows, committeeRows] = await Promise.all([
    // Acara di Sampah tidak pernah masuk scope (dikelola dari Sampah).
    db
      .select({ id: events.id })
      .from(events)
      .where(and(eq(events.createdBy, userId), isNull(events.deletedAt))),
    db
      .selectDistinct({ id: eventResponsibleDepartments.eventId })
      .from(eventResponsibleDepartments)
      .innerJoin(
        departmentMembers,
        eq(departmentMembers.departmentId, eventResponsibleDepartments.departmentId),
      )
      .innerJoin(events, eq(events.id, eventResponsibleDepartments.eventId))
      .where(and(eq(departmentMembers.userId, userId), isNull(events.deletedAt))),
    db
      .select({ id: eventCommittee.eventId })
      .from(eventCommittee)
      .innerJoin(events, eq(events.id, eventCommittee.eventId))
      .where(and(eq(eventCommittee.userId, userId), isNull(events.deletedAt))),
  ]);
  return [
    ...new Set([
      ...createdRows.map((r) => r.id),
      ...pjRows.map((r) => r.id),
      ...committeeRows.map((r) => r.id),
    ]),
  ];
});

/**
 * Untuk halaman & server action konsol acara: redirect kalau tidak berwenang,
 * persis pola requireModuleAccess(). Mengembalikan EventAccess supaya pemanggil
 * bisa memeriksa kapabilitas lain tanpa query ulang.
 */
export async function requireEventCapability(
  eventId: string,
  capability: EventCapability,
): Promise<EventAccess & { session: Session }> {
  const access = await getEventAccess(eventId);
  if (!access.session) redirect("/login");
  if (!access.can(capability)) redirect("/console");
  return access as EventAccess & { session: Session };
}

/**
 * Evaluasi panitia (kolektif): siapa yang boleh MEMBACA isi jawaban beserta nama
 * pengisinya, dan siapa yang boleh MENGUBAH (jendela waktu, pertanyaan panitia,
 * hapus respons). Satu tempat supaya halaman konsol, server action, dan route
 * ekspor tidak bisa saling geser.
 * - Baca: BPH Kabinet/Teknologi atau BPH Panitia acara ini — tetap boleh setelah
 *   acara terkunci (rekap dibutuhkan untuk LPJ).
 * - Ubah: sama, tapi BPH Panitia tunduk pada kunci kepanitiaan 14 hari setelah
 *   acara (setelahnya hanya BPH Kabinet), sama seperti kapabilitas panitia lain.
 */
// Gerbang dasar ekspor evaluasi acara (file Excel/CSV dan Google Sheet): ada
// sesi, dan orangnya punya jalan masuk ke konsol acara ini. Evaluasi PANITIA
// masih perlu canReadCommitteeEvaluation di atasnya.
export function hasEvaluationExportAccess(access: EventAccess): boolean {
  return Boolean(access.session) && (access.isFullAdmin || access.moduleBridge || access.role != null);
}

export function canReadCommitteeEvaluation(access: EventAccess): boolean {
  return access.isFullAdmin || access.isBphPanitia;
}

export function canEditCommitteeEvaluation(access: EventAccess): boolean {
  return access.isFullAdmin || (access.isBphPanitia && !access.locked);
}

/**
 * Untuk route handler (yang perlu balas 403, bukan redirect). Bool saja.
 */
export async function hasEventCapabilityFor(
  eventId: string,
  capability: EventCapability,
): Promise<boolean> {
  const access = await getEventAccess(eventId);
  return access.can(capability);
}

/**
 * Gerbang dasar halaman/aksi konsol acara: cukup punya SATU peran di kepanitiaan
 * acara ini (atau BPH Kabinet / jembatan modul). Section di dalamnya masih
 * disaring per-kapabilitas lewat `access.can(...)`.
 */
export async function requireEventConsoleAccess(
  eventId: string,
): Promise<EventAccess & { session: Session }> {
  const access = await getEventAccess(eventId);
  if (!access.session) redirect("/login");
  // Acara di Sampah: kembali ke daftar Kegiatan (bagian Sampah ada di sana).
  if (access.trashed) redirect("/console/events");
  if (!access.isFullAdmin && !access.moduleBridge && access.role == null) redirect("/console");
  return access as EventAccess & { session: Session };
}
