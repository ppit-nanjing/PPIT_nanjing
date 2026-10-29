import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { and, asc, eq, isNull, or, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { departmentMembers, departments, eventCommittee, eventResponsibleDepartments, events, forms, sensusProfiles, users } from "@/db/schema";
import type { FormRow } from "@/db/schema";
import { hasModuleAccess } from "@/lib/admin-scope";
import { isBphPanitiaRole } from "@/lib/event-capabilities";
import { getEventAccess } from "@/lib/event-access";
import { UUID_RE } from "@/lib/uuid";

// Gerbang server tunggal untuk modul Formulir (Pemilu, Oprek BPH Acara, Oprek
// Kepanitiaan). Dipakai SEMUA halaman, Server Action, dan route ekspor —
// sidebar hanya visibilitas, bukan kontrol akses (AGENTS.md).
//
// Peran:
// - full (BPH Inti + Divisi Teknologi) / modul "forms" -> semua
// - Koordinator Divisi (isCoordinator dari sesi) -> tab Oprek BPH Acara
// - BPH Panitia sebuah acara -> form Oprek acara itu (tab Kepanitiaan), termasuk
//   Oprek Kadiv
// - Kadiv sebuah acara -> Oprek anggota (oprek_kepanitiaan) acara itu: melihat
//   SEMUA pelamar semua divisi dan boleh memutuskannya (keputusan BPH 2026-10-15),
//   tapi hanya menempatkan sebagai peran anggota divisi (KADIV_PLACEMENT_ROLES).
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
  // Acara tempat user ini Kadiv (kelola Oprek anggota acara itu).
  kadivEventIds: string[];
  // Semua acara tempat user ini panitia (peran apa pun). Dipakai modul Formulir:
  // panitia boleh membuat formulir untuk acaranya.
  committeeEventIds: string[];
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
  const kadivEventIds = committeeRows.filter((r) => r.role === "kadiv").map((r) => r.eventId);

  const canBphTab = isFull || canForms || isCoordinator;
  const canKepanitiaanTab = isFull || canForms || bphEventIds.length > 0 || kadivEventIds.length > 0;

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
    kadivEventIds,
    committeeEventIds: [...new Set(committeeRows.map((r) => r.eventId))],
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
  // Acara di Sampah: form-nya terkunci untuk SEMUA orang — pulihkan dulu
  // acaranya dari bagian Sampah. getEventAccess() cached, jadi ini murah.
  if (form.eventId) {
    const eventAccess = await getEventAccess(form.eventId);
    if (eventAccess.trashed) return false;
  }
  if (acc.isFull || acc.canForms) return true;
  if (form.kind === "pemilu") return false;
  if (form.kind === "survei") return canManageSurvey(form, acc);
  if (form.createdBy && form.createdBy === acc.userId) return true;
  if (form.eventId) {
    const eventAccess = await getEventAccess(form.eventId);
    if (eventAccess.isBphPanitia) return true;
    // Kadiv mengelola Oprek anggota acaranya (bukan Oprek Kadiv/BPH).
    if (form.kind === "oprek_kepanitiaan" && eventAccess.role === "kadiv") return true;
  }
  return false;
}

/**
 * Pembuat formulir masih berhak mengelola formulirnya selama masih berhak MEMBUAT:
 * anggota kabinet, atau panitia acara tempat formulir itu terikat. Orang yang sudah
 * keluar dari keduanya tidak otomatis memegang hasil formulir (yang bisa memuat
 * biodata) selamanya. `isCabinetMember` dihitung pemanggil supaya fungsi ini murni.
 */
export function isSurveyCreatorEligible(
  access: Pick<FormsAccess, "committeeEventIds">,
  isCabinetMember: boolean,
  eventId: string | null,
): boolean {
  if (isCabinetMember) return true;
  return eventId !== null && access.committeeEventIds.includes(eventId);
}

// Kelola formulir: pembuat yang masih berhak, atau BPH Panitia acara terikatnya.
// Pemegang full/modul forms sudah lolos di canManageForm sebelum sampai sini.
async function canManageSurvey(
  form: Pick<FormRow, "eventId" | "createdBy">,
  acc: FormsAccess,
): Promise<boolean> {
  if (form.createdBy && form.createdBy === acc.userId) {
    const membership = await getCabinetMembership(acc.userId);
    // Akun yang dibekukan kehilangan hak pembuat (sesi lama bisa masih hidup).
    if (
      membership?.status !== "suspended" &&
      isSurveyCreatorEligible(acc, membership?.isCabinetMember === true, form.eventId)
    ) {
      return true;
    }
  }
  if (form.eventId) {
    const eventAccess = await getEventAccess(form.eventId);
    if (eventAccess.isBphPanitia) return true;
  }
  return false;
}

// Acara yang boleh dipakai koordinator untuk membuat form Oprek BPH: acara
// yang divisinya tercatat sebagai Divisi Penanggung Jawab, atau yang dia buat
// sendiri. `null` = tanpa batas (full / modul forms). Tanpa batas ini koor
// divisi mana pun bisa membuka Oprek BPH untuk acara divisi lain lalu
// (sebagai pembuat form) menempatkan pelamar — termasuk dirinya — jadi ketua.
export async function getCoordinatorEventIds(access: FormsAccess): Promise<string[] | null> {
  if (access.isFull || access.canForms) return null;
  const rows = await db
    .selectDistinct({ id: events.id })
    .from(events)
    .where(
      and(
        isNull(events.deletedAt),
        or(
          eq(events.createdBy, access.userId),
          sql`exists (
            select 1 from ${eventResponsibleDepartments} erd
            join ${departmentMembers} dm on dm.department_id = erd.department_id
            where erd.event_id = ${events.id} and dm.user_id = ${access.userId}
          )`,
        ),
      ),
    );
  return rows.map((r) => r.id);
}

// Gerbang wajib untuk halaman/aksi/ekspor PER FORM (bukan requireFormsHub yang
// sengaja longgar). Memuat baris form, 404 kalau id ngawur/tidak ada, dan
// 404 juga kalau tidak berhak — jangan bocorkan keberadaan form.
export async function requireFormManage(formId: string): Promise<{ form: FormRow; access: FormsAccess }> {
  const access = await getFormsAccess();
  if (!access) redirect("/login");
  if (!UUID_RE.test(formId)) notFound();
  const [form] = await db.select().from(forms).where(eq(forms.id, formId));
  if (!form) notFound();
  if (!(await canManageForm(form, access))) notFound();
  return { form, access };
}

// Penulisan penempatan (event_committee) menghormati kunci acara 14 hari:
// setelah acara selesai+batas, panitia biasa tidak boleh menulis lagi —
// hanya BPH Kabinet/Divisi Teknologi. Yang boleh menempatkan: BPH Acara acara
// itu, ATAU koor/pembuat form (mereka yang menjalankan rekrutmen BPH sebelum
// kepanitiaan terbentuk), ATAU pemegang modul forms/full.
export async function canPlaceApplicant(
  form: Pick<FormRow, "eventId" | "createdBy" | "kind">,
  access: FormsAccess,
): Promise<boolean> {
  // Form tanpa acara (Pemilu) tidak menyentuh kepanitiaan sama sekali.
  if (!form.eventId) return false;
  const eventAccess = await getEventAccess(form.eventId);
  // Acara di Sampah: penempatan dikunci untuk semua orang (pulihkan dulu).
  if (eventAccess.trashed) return false;
  if (access.isFull || access.canForms) return true;
  if (form.createdBy && form.createdBy === access.userId) {
    return !eventAccess.locked;
  }
  const isKadivOnMemberForm = form.kind === "oprek_kepanitiaan" && eventAccess.role === "kadiv";
  if (!eventAccess.isBphPanitia && !isKadivOnMemberForm) return false;
  return !eventAccess.locked;
}

/**
 * Penempat Oprek anggota yang BUKAN BPH Panitia/full/modul forms — praktisnya
 * Kadiv, atau pembuat form yang belakangan dicopot dari kepanitiaan (jalur
 * "pembuat form" di canPlaceApplicant) — dibatasi ke peran anggota divisi:
 * mereka tidak boleh mengangkat orang jadi BPH atau Kadiv lewat form ini.
 */
export async function isKadivOnlyPlacer(
  form: Pick<FormRow, "eventId" | "kind">,
  access: FormsAccess,
): Promise<boolean> {
  if (form.kind !== "oprek_kepanitiaan" || !form.eventId) return false;
  if (access.isFull || access.canForms) return false;
  const eventAccess = await getEventAccess(form.eventId);
  return !eventAccess.isBphPanitia;
}

/**
 * Boleh MENGISI form ini? Pengurus kabinet (Struktur Organisasi) selalu boleh;
 * akun lain hanya kalau form-nya dibuka untuk semua akun (bukan Pemilu).
 * Akun suspended tidak pernah boleh. Dipakai halaman isi DAN aksi submit.
 */
export function canFillForm(
  form: Pick<FormRow, "kind" | "openToAllAccounts">,
  membership: CabinetMembership | null,
): boolean {
  if (!membership || membership.status === "suspended") return false;
  if (membership.isCabinetMember) return true;
  return form.openToAllAccounts && form.kind !== "pemilu";
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
      joinedAt: departmentMembers.joinedAt,
    })
    .from(users)
    .leftJoin(sensusProfiles, eq(sensusProfiles.userId, users.id))
    .leftJoin(departmentMembers, eq(departmentMembers.userId, users.id))
    .leftJoin(departments, eq(departments.id, departmentMembers.departmentId))
    .where(eq(users.id, userId))
    // Deterministik kalau (seharusnya tidak terjadi, tapi) user punya lebih
    // dari satu baris department_members: divisi terlama yang dipakai.
    .orderBy(asc(departmentMembers.joinedAt));
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
