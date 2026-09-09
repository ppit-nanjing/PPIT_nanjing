// Client-safe half of admin-scope.ts - types, constants, and the pure
// hasModuleAccess() check, with zero imports of @/auth or @/db. Split out
// because department-manager.tsx (a "use client" component) needs
// ASSIGNABLE_SCOPE_KEYS: importing it from admin-scope.ts would pull that
// file's `import { auth } from "@/auth"` - and therefore `@/db`'s
// `neon(process.env.DATABASE_URL!)` - into the browser bundle, where
// DATABASE_URL is never defined. That's what threw "No database connection
// string was provided to neon()" in the browser console on /console/organization.

// Module keys must match the values seeded into departments.adminModuleScope
// (src/db/seed.ts). "gallery" still aliases "content" (one page). "sensus" used
// to alias "reports" too, but the per-person census view + proof (passports,
// student cards) now lives on its own page /console/sensus with its own key -
// see admin-scope.ts and drizzle/0033_sensus_scope_split.sql.
// "notifications" (template wording sent org-wide to every member) is
// deliberately absent from ASSIGNABLE_SCOPE_KEYS below, so hasModuleAccess()
// only ever returns true for it via the `scope === "full"` short-circuit -
// same non-delegable treatment as users/organization/feedback.
export type AdminModule = "users" | "organization" | "events" | "inventory" | "reports" | "sensus" | "content" | "feedback" | "membership" | "notifications" | "links" | "documents";

const MODULE_ALIASES: Partial<Record<AdminModule, string[]>> = {
  content: ["content", "gallery"],
};

// Raw scope keys assignable to a department's adminModuleScope, for the
// checkbox list in the Organization admin UI. "gallery" is kept as a distinct
// option (matching what src/db/seed.ts assigned) even though hasModuleAccess()
// treats it as an alias of "content" - keeping the raw key in the DB means
// access won't silently change meaning if content/gallery get split later.
// "sensus" IS delegable (a full admin can tick it for a division here), but it
// is also in SENSITIVE_SCOPE_KEYS: for now only BPH + Divisi Teknologi (full
// admins) hold it - see the census page's access note.
export const ASSIGNABLE_SCOPE_KEYS: { key: string; label: string }[] = [
  { key: "events", label: "Kegiatan" },
  { key: "inventory", label: "Inventaris" },
  { key: "reports", label: "Laporan (termasuk ekspor data mahasiswa)" },
  { key: "sensus", label: "Sensus (data & bukti mahasiswa per orang — sensitif)" },
  { key: "content", label: "Konten (berita)" },
  { key: "gallery", label: "Galeri" },
  { key: "users", label: "Pengguna (sensitif — hanya BPH)" },
  { key: "organization", label: "Organisasi (sensitif — hanya BPH)" },
  { key: "feedback", label: "Masukan Pengguna (sensitif — hanya BPH)" },
  { key: "membership", label: "Pendaftaran Anggota (rekrutmen)" },
  { key: "links", label: "Tautan (short link)" },
  { key: "documents", label: "Dokumen (Google Drive)" },
];

// Keys that only a "full" tier actor may grant to a department - handing these
// out via a scoped "organization" edit would let that department promote
// itself (or any department) to full admin, or hand out access to raw passport
// numbers and student cards ("sensus"). Enforced in updateDepartment()
// (admin-departments.ts), not just hidden in the UI, since the server action
// is reachable directly regardless of what the form renders.
export const SENSITIVE_SCOPE_KEYS = ["users", "organization", "feedback", "sensus"] as const;

export function hasModuleAccess(scope: "full" | string[] | null, mod: AdminModule): boolean {
  if (scope === "full") return true;
  if (!scope) return false;
  const keys = MODULE_ALIASES[mod] ?? [mod];
  return keys.some((k) => scope.includes(k));
}
