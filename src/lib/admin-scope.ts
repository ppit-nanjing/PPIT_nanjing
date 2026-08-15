import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { type AdminModule, hasModuleAccess } from "@/lib/admin-scope-constants";

// Re-exported for existing server-only call sites - safe here since this file
// is never imported from a "use client" component (see admin-scope-constants.ts
// for why that split exists and department-manager.tsx for the one place that
// needs the client-safe half directly).
export type { AdminModule };
export { ASSIGNABLE_SCOPE_KEYS, hasModuleAccess } from "@/lib/admin-scope-constants";

// "users", "organization", and "feedback" are deliberately not delegable via
// adminModuleScope (no seed row lists them) - full tier only, matching BPH-level
// responsibility per the guidebook.
export async function requireModuleAccess(mod: AdminModule) {
  const session = await auth();
  if (!session) redirect("/login");
  if (!hasModuleAccess(session.user.adminScope, mod)) redirect("/console");
  return session;
}
