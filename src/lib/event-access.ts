import type { Session } from "next-auth";
import { cache } from "react";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { eventCommittee, eventDivisions, events } from "@/db/schema";
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

// TRANSISI. Selama false, siapa pun yang divisi kabinetnya pegang scope "events"
// tetap tembus ke SEMUA acara persis seperti sebelum fitur ini (moduleBridge) -
// jadi tidak ada yang kehilangan akses saat rilis. Kepanitiaan hanya MENAMBAH
// akses per-acara di atasnya. Setelah BPH mengisi kepanitiaan acara-acara aktif,
// set true supaya scope "events" tidak lagi memberi akses buta ke semua acara
// (hanya "full" + panitia acara ybs).
export const EVENT_RBAC_STRICT = false;

export type EventAccess = {
  session: Session | null;
  // Peran orang ini di kepanitiaan acara ybs, atau null kalau bukan panitia.
  role: EventCommitteeRole | null;
  // true kalau `role` termasuk jabatan BPH Panitia (ketua/wakil/sekretaris/SC).
  isBphPanitia: boolean;
  // BPH Kabinet: adminScope "full" + setiap anggota Divisi Teknologi.
  isFullAdmin: boolean;
  // Jembatan transisi: punya scope modul "events" dan EVENT_RBAC_STRICT masih false.
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
  const moduleBridge =
    !EVENT_RBAC_STRICT && hasModuleAccess(session.user.adminScope ?? null, "events");

  // Peran + grant divisi orang ini untuk acara ini. Indeks unik
  // (event_id, user_id) menjamin paling banyak satu baris. Di-query untuk full
  // admin juga - pemanggil memakai `role` di UI dan biayanya satu lookup.
  // eventId non-UUID (mis. FormData kosong) tidak di-query - Postgres akan
  // melempar sintaks uuid; anggap saja "bukan panitia".
  let role: EventCommitteeRole | null = null;
  let divisionGrants: string[] = [];
  let locked = false;
  if (UUID_RE.test(eventId)) {
    const [row] = await db
      .select({
        role: eventCommittee.role,
        divisionGrants: eventDivisions.grantedCapabilities,
        status: events.status,
        startAt: events.startAt,
        endAt: events.endAt,
      })
      .from(eventCommittee)
      .leftJoin(eventDivisions, eq(eventCommittee.divisionId, eventDivisions.id))
      // Kolom acara di-join dari eventCommittee.eventId yang selalu = eventId,
      // jadi bila orang ini bukan panitia kita perlu lookup acara terpisah.
      .innerJoin(events, eq(events.id, eventCommittee.eventId))
      .where(and(eq(eventCommittee.eventId, eventId), eq(eventCommittee.userId, session.user.id)))
      .limit(1);
    if (row) {
      role = (row.role as EventCommitteeRole | undefined) ?? null;
      divisionGrants = row.divisionGrants ?? [];
      locked = isCommitteeLocked({ status: row.status, startAt: row.startAt, endAt: row.endAt });
    } else if (!isFullAdmin) {
      // Bukan panitia (mis. moduleBridge) — tetap perlu tahu status kunci acara.
      const [ev] = await db
        .select({ status: events.status, startAt: events.startAt, endAt: events.endAt })
        .from(events)
        .where(eq(events.id, eventId));
      if (ev) locked = isCommitteeLocked(ev);
    }
  }

  return {
    session,
    role,
    isBphPanitia: isBphPanitiaRole(role),
    isFullAdmin,
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
  if (!access.isFullAdmin && !access.moduleBridge && access.role == null) redirect("/console");
  return access as EventAccess & { session: Session };
}
