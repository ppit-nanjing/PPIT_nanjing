import { cache } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { departmentMembers, departments, eventCommittee, sensusProfiles, users } from "@/db/schema";
import type { FormRow } from "@/db/schema";
import { hasModuleAccess } from "@/lib/admin-scope";
import { isBphPanitiaRole } from "@/lib/event-capabilities";
import { getEventAccess } from "@/lib/event-access";

// Gerbang server tunggal untuk modul Formulir (Pemilu, Oprek BPH Acara, Oprek
// Kepanitiaan). Dipakai SEMUA halaman, Server Action, dan route ekspor —
// sidebar hanya visibilitas, bukan kontrol akses (AGENTS.md).
//
// Peran:
// - full (BPH Inti + Divisi Teknologi) / modul "forms" -> semua
// - Koordinator Divisi (isCoordinator dari sesi) -> tab Oprek BPH Acara
// - BPH Panitia sebuah acara -> form Oprek acara itu (tab Kepanitiaan)
// - Anggota kabinet biasa -> boleh MENGISI form, tidak melihat hasil
//   (diatur getCabinetMembership + halaman/publik form).

export type FormsAccess = {
  userId: string;
  isFull: boolean;
  canForms: boolean;
  isCoordinator: boolean;
  // Tab "Pendaftaran PPIT" hanya menaut ke halaman /console/membership yang
  // sudah ada; sembunyikan kalau tidak punya modul membership.
  canMembership: boolean;
  // Tab-tab
  canPemilu: boolean;
  canBphTab: boolean;
  canKepanitiaanTab: boolean;
  // Acara tempat user ini BPH Panitia (ketua/wakil/sekretaris/bendahara/supervisor).
  bphEventIds: string[];
};

export const getFormsAccess = cache(async (): Promise<FormsAccess | null> => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!session || !userId) return null;

  const scope = session.user.adminScope;
  const isFull = scope === "full";
  const canForms = isFull || hasModuleAccess(scope, "forms");
  const canMembership = isFull || hasModuleAccess(scope, "membership");
  const isCoordinator = session.user.isCoordinator;

  const committeeRows = await db
    .select({ eventId: eventCommittee.eventId, role: eventCommittee.role })
    .from(eventCommittee)
    .where(eq(eventCommittee.userId, userId));
  const bphEventIds = committeeRows.filter((r) => isBphPanitiaRole(r.role)).map((r) => r.eventId);

  const canBphTab = isFull || canForms || isCoordinator;
  const canKepanitiaanTab = isFull || canForms || bphEventIds.length > 0;

  return {
    userId,
    isFull,
    canForms,
    isCoordinator,
    canMembership,
    canPemilu: isFull || canForms,
    canBphTab,
    canKepanitiaanTab,
    bphEventIds,
  };
});

// Hub /console/forms + halaman tab: minimal salah satu tab bisa diakses.
export async function requireFormsHub(): Promise<FormsAccess> {
  const access = await getFormsAccess();
  if (!access) redirect("/login");
  if (!access.canPemilu && !access.canBphTab && !access.canKepanitiaanTab) redirect("/console");
  return access;
}

export async function requirePemiluTab(): Promise<FormsAccess> {
  const access = await requireFormsHub();
  if (!access.canPemilu) redirect("/console/forms");
  return access;
}

export async function requireBphTab(): Promise<FormsAccess> {
  const access = await requireFormsHub();
  if (!access.canBphTab) redirect("/console/forms");
  return access;
}

export async function requireKepanitiaanTab(): Promise<FormsAccess> {
  const access = await requireFormsHub();
  if (!access.canKepanitiaanTab) redirect("/console/forms");
  return access;
}

// Kelola satu form (ubah, buka/tutup, respons, analitik, ekspor).
// BPH Acara sebuah acara boleh mengelola form oprek acara itu; pembuat form
// (koor) boleh mengelola formnya sendiri; pemilu hanya full/modul.
export async function canManageForm(
  form: Pick<FormRow, "kind" | "eventId" | "createdBy">,
  access?: FormsAccess | null,
): Promise<boolean> {
  const acc = access === undefined ? await getFormsAccess() : access;
  if (!acc) return false;
  if (acc.isFull || acc.canForms) return true;
  if (form.kind === "pemilu") return false;
  if (form.createdBy && form.createdBy === acc.userId) return true;
  if (form.eventId) {
    const eventAccess = await getEventAccess(form.eventId);
    if (eventAccess.isBphPanitia) return true;
  }
  return false;
}

export type CabinetMembership = {
  status: string;
  // Nama panjang untuk snapshot: sensus_profiles.full_name kalau ada,
  // fallback users.name (beberapa akun memakai nama pendek, mis. "gwen").
  displayName: string;
  divisionName: string | null;
  isCabinetMember: boolean;
};

// Syarat mengisi form Oprek/Pemilu: punya baris di Struktur Organisasi
// (department_members) dan akun tidak suspended. Dipakai halaman publik
// /forms/[id] DAN aksi submit (halaman saja bukan kontrol akses).
export const getCabinetMembership = cache(async (userId: string): Promise<CabinetMembership | null> => {
  const rows = await db
    .select({
      status: users.status,
      accountName: users.name,
      fullName: sensusProfiles.fullName,
      divisionName: departments.name,
    })
    .from(users)
    .leftJoin(sensusProfiles, eq(sensusProfiles.userId, users.id))
    .leftJoin(departmentMembers, eq(departmentMembers.userId, users.id))
    .leftJoin(departments, eq(departments.id, departmentMembers.departmentId))
    .where(eq(users.id, userId));
  if (rows.length === 0) return null;

  const first = rows[0];
  const divisionName = rows.find((r) => r.divisionName)?.divisionName ?? null;
  return {
    status: first.status,
    displayName: first.fullName ?? first.accountName ?? "",
    divisionName,
    isCabinetMember: first.status !== "suspended" && divisionName !== null,
  };
});
