import type { Session } from "next-auth";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { eventCommittee, eventDivisions } from "@/db/schema";
import { hasModuleAccess } from "@/lib/admin-scope";
import {
  type EventCapability,
  type EventCommitteeRole,
  FULL_ADMIN_ONLY_CAPABILITIES,
  hasEventCapability,
  isBphPanitiaRole,
} from "@/lib/event-capabilities";

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
  can: (capability: EventCapability) => boolean;
};

const DENIED: EventAccess = {
  session: null,
  role: null,
  isBphPanitia: false,
  isFullAdmin: false,
  moduleBridge: false,
  divisionGrants: [],
  can: () => false,
};

export async function getEventAccess(eventId: string): Promise<EventAccess> {
  const session = await auth();
  if (!session?.user?.id) return DENIED;

  const isFullAdmin = session.user.adminScope === "full";
  const moduleBridge =
    !EVENT_RBAC_STRICT && hasModuleAccess(session.user.adminScope ?? null, "events");

  // Peran + grant divisi orang ini untuk acara ini. Indeks unik
  // (event_id, user_id) menjamin paling banyak satu baris. Di-query untuk full
  // admin juga - pemanggil memakai `role` di UI dan biayanya satu lookup.
  const [row] = await db
    .select({
      role: eventCommittee.role,
      divisionGrants: eventDivisions.grantedCapabilities,
    })
    .from(eventCommittee)
    .leftJoin(eventDivisions, eq(eventCommittee.divisionId, eventDivisions.id))
    .where(and(eq(eventCommittee.eventId, eventId), eq(eventCommittee.userId, session.user.id)))
    .limit(1);

  const role = (row?.role as EventCommitteeRole | undefined) ?? null;
  const divisionGrants = row?.divisionGrants ?? [];

  return {
    session,
    role,
    isBphPanitia: isBphPanitiaRole(role),
    isFullAdmin,
    moduleBridge,
    divisionGrants,
    can: (capability) =>
      isFullAdmin ||
      (moduleBridge && !FULL_ADMIN_ONLY_CAPABILITIES.includes(capability)) ||
      hasEventCapability(role, capability, divisionGrants),
  };
}

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
