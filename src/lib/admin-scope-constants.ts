// Client-safe half of admin-scope.ts - types, constants, and the pure
// hasModuleAccess() check, with zero imports of @/auth or @/db. Split out
// because department-manager.tsx (a "use client" component) needs
// ASSIGNABLE_SCOPE_KEYS: importing it from admin-scope.ts would pull that
// file's `import { auth } from "@/auth"` - and therefore `@/db`'s
// `neon(process.env.DATABASE_URL!)` - into the browser bundle, where
// DATABASE_URL is never defined. That's what threw "No database connection
// string was provided to neon()" in the browser console on /console/organization.

// Module keys must match the values seeded into departments.adminModuleScope
// (src/db/seed.ts) - "sensus" and "reports" both unlock /console/reports since
// that page hasn't been split into separate sensus vs. financial-report views
// yet (see docs/Progress & Handoff.md).
export type AdminModule = "users" | "organization" | "events" | "inventory" | "reports" | "content" | "feedback";

const MODULE_ALIASES: Partial<Record<AdminModule, string[]>> = {
  reports: ["reports", "sensus"],
  content: ["content", "gallery"],
};

// Raw scope keys assignable to a department's adminModuleScope, for the
// checkbox list in the Organization admin UI. "sensus" and "gallery" are kept
// as distinct options (matching what src/db/seed.ts actually assigned) even
// though hasModuleAccess() currently treats them as aliases of reports/content
// - keeping the raw keys in the DB means access won't silently change meaning
// if reports/content get split into their own pages later.
export const ASSIGNABLE_SCOPE_KEYS: { key: string; label: string }[] = [
  { key: "events", label: "Kegiatan" },
  { key: "inventory", label: "Inventaris" },
  { key: "reports", label: "Laporan (termasuk ekspor data mahasiswa)" },
  { key: "sensus", label: "Sensus (ringkasan saja)" },
  { key: "content", label: "Konten (berita)" },
  { key: "gallery", label: "Galeri" },
  { key: "users", label: "Pengguna (sensitif — hanya BPH)" },
  { key: "organization", label: "Organisasi (sensitif — hanya BPH)" },
  { key: "feedback", label: "Masukan Pengguna (sensitif — hanya BPH)" },
];

// Keys that only a "full" tier actor may grant to a department - handing these
// out via a scoped "organization" edit would let that department promote
// itself (or any department) to full admin. Enforced in updateDepartment()
// (admin-departments.ts), not just hidden in the UI, since the server action
// is reachable directly regardless of what the form renders.
export const SENSITIVE_SCOPE_KEYS = ["users", "organization", "feedback"] as const;

export function hasModuleAccess(scope: "full" | string[] | null, mod: AdminModule): boolean {
  if (scope === "full") return true;
  if (!scope) return false;
  const keys = MODULE_ALIASES[mod] ?? [mod];
  return keys.some((k) => scope.includes(k));
}
