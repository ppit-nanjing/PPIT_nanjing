import { redirect } from "next/navigation";
import { auth } from "@/auth";

// Module keys must match the values seeded into departments.adminModuleScope
// (src/db/seed.ts) - "sensus" and "reports" both unlock /console/reports since
// that page hasn't been split into separate sensus vs. financial-report views
// yet (see docs/Progress & Handoff.md).
export type AdminModule = "users" | "organization" | "events" | "inventory" | "reports" | "content" | "feedback";

const MODULE_ALIASES: Partial<Record<AdminModule, string[]>> = {
  reports: ["reports", "sensus"],
  content: ["content", "gallery"],
};

export function hasModuleAccess(scope: "full" | string[] | null, mod: AdminModule): boolean {
  if (scope === "full") return true;
  if (!scope) return false;
  const keys = MODULE_ALIASES[mod] ?? [mod];
  return keys.some((k) => scope.includes(k));
}

// "users", "organization", and "feedback" are deliberately not delegable via
// adminModuleScope (no seed row lists them) - full tier only, matching BPH-level
// responsibility per the guidebook.
export async function requireModuleAccess(mod: AdminModule) {
  const session = await auth();
  if (!session) redirect("/login");
  if (!hasModuleAccess(session.user.adminScope, mod)) redirect("/console");
  return session;
}
