import { cache } from "react";
import { redirect } from "next/navigation";
import { and, desc, eq, inArray, isNull, ne, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { events, formApplications, forms } from "@/db/schema";
import { getCabinetMembership, getCoordinatorEventIds, getFormsAccess, type FormsAccess } from "@/lib/form-access";
import type { FormKind } from "@/lib/form-types";

// Gerbang server modul Formulir. Formulir dibuat dan dikelola dari /formulir, BUKAN
// dari /console: layout konsol hanya menerima admin/koordinator/panitia, dan
// dashboard konsol menampilkan data (pesan masukan, nama pendaftar) yang tidak
// untuk semua pengurus kabinet. Siapa yang boleh apa:
// - MEMBUAT: pengurus kabinet (formulir kabinet, atau terikat acara) dan panitia
//   acara (hanya untuk acaranya). Pemegang full/modul forms bebas.
// - MENGELOLA + MELIHAT HASIL: pembuat yang masih berhak, BPH Panitia acara
//   terikatnya, pemegang full/modul forms (canManageForm di form-access.ts).
// - MENGISI: siapa pun yang diizinkan formulir itu (lihat /f/[id]).
// Sidebar dan tombol hanya visibilitas; setiap halaman dan aksi mengulang cek ini.

export type SurveyAccess = {
  access: FormsAccess;
  isCabinetMember: boolean;
  // Boleh membuat formulir tanpa acara (formulir kabinet).
  canCreateUnbound: boolean;
  canCreate: boolean;
};

export const getSurveyAccess = cache(async (): Promise<SurveyAccess | null> => {
  const access = await getFormsAccess();
  if (!access) return null;
  const membership = await getCabinetMembership(access.userId);
  // Akun yang dibekukan tidak boleh membuat apa pun, walau sesinya masih hidup.
  if (membership?.status === "suspended") {
    return { access, isCabinetMember: false, canCreateUnbound: false, canCreate: false };
  }
  const isCabinetMember = membership?.isCabinetMember === true;
  const canCreateUnbound = access.isFull || access.canForms || isCabinetMember;
  const canCreate = canCreateUnbound || access.committeeEventIds.length > 0;
  return { access, isCabinetMember, canCreateUnbound, canCreate };
});

/** Halaman hub / buat formulir: harus login dan berhak membuat. */
export async function requireSurveyHub(): Promise<SurveyAccess> {
  const sa = await getSurveyAccess();
  if (!sa) redirect("/login?returnTo=%2Fformulir");
  if (!sa.canCreate) redirect("/");
  return sa;
}

export type SurveyEventOption = { id: string; title: string };

/**
 * Acara yang boleh dipasangi formulir oleh user ini. Pemegang full/modul forms:
 * semua acara. Lainnya: acara tempat dia panitia; pengurus kabinet juga acara
 * yang dia buat atau yang divisi penanggung jawabnya divisinya (pola yang sama
 * dengan getCoordinatorEventIds). Acara di Sampah tidak pernah masuk.
 */
export async function listSurveyEvents(sa: SurveyAccess): Promise<SurveyEventOption[]> {
  const { access } = sa;
  let scope;
  if (!sa.canCreate) {
    scope = sql`false`;
  } else if (access.isFull || access.canForms) {
    scope = undefined;
  } else {
    // Acara yang dibuat atau yang divisi penanggung jawabnya divisinya: aturan yang sama dengan
    // pembuat Oprek BPH (getCoordinatorEventIds), hanya untuk pengurus kabinet.
    const coordinated = sa.isCabinetMember ? ((await getCoordinatorEventIds(access)) ?? []) : [];
    const ids = [...new Set([...access.committeeEventIds, ...coordinated])];
    scope = ids.length > 0 ? inArray(events.id, ids) : sql`false`;
  }
  return db
    .select({ id: events.id, title: events.title })
    .from(events)
    .where(and(isNull(events.deletedAt), scope))
    .orderBy(desc(events.startAt))
    .limit(300);
}

export type SurveyListRow = {
  id: string;
  title: string;
  eventId: string | null;
  eventTitle: string | null;
  isOpen: boolean;
  allowPublic: boolean;
  opensAt: Date | null;
  closesAt: Date | null;
  createdAt: Date;
  createdByMe: boolean;
  responseCount: number;
};

/**
 * Formulir yang boleh dikelola user ini, terbaru dulu. Syarat sama dengan
 * canManageForm untuk formulir: full/modul forms melihat semuanya; lainnya
 * melihat buatannya sendiri (selama masih berhak membuat) dan formulir acara
 * tempat dia BPH Panitia. Formulir di acara yang masuk Sampah disembunyikan.
 */
export async function listManageableSurveys(sa: SurveyAccess): Promise<SurveyListRow[]> {
  const { access } = sa;
  const mine = and(
    eq(forms.createdBy, access.userId),
    sa.isCabinetMember
      ? sql`true`
      : access.committeeEventIds.length > 0
        ? inArray(forms.eventId, access.committeeEventIds)
        : sql`false`,
  );
  const scope =
    access.isFull || access.canForms
      ? undefined
      : or(mine, access.bphEventIds.length > 0 ? inArray(forms.eventId, access.bphEventIds) : sql`false`);

  const rows = await db
    .select({
      id: forms.id,
      title: forms.title,
      eventId: forms.eventId,
      eventTitle: events.title,
      isOpen: forms.isOpen,
      allowPublic: forms.allowPublic,
      opensAt: forms.opensAt,
      closesAt: forms.closesAt,
      createdAt: forms.createdAt,
      createdBy: forms.createdBy,
      responseCount: sql<number>`(select count(*)::int from form_responses fr where fr.form_id = ${forms.id})`,
    })
    .from(forms)
    .leftJoin(events, eq(events.id, forms.eventId))
    .where(and(eq(forms.kind, "survei"), or(isNull(forms.eventId), isNull(events.deletedAt)), scope))
    .orderBy(desc(forms.createdAt))
    .limit(300);

  return rows.map(({ createdBy, ...r }) => ({ ...r, createdByMe: createdBy === access.userId }));
}

const OPREK_KINDS: FormKind[] = ["oprek_bph_acara", "oprek_kepanitiaan", "oprek_kadiv"];

/**
 * Formulir semua jenis yang dikelola user ini, sebagai syarat SQL. Cermin canManageForm
 * (form-access.ts): full/modul forms semuanya; lainnya buatannya sendiri (Formulir Kustom
 * hanya selama masih berhak membuat), formulir acara tempat dia BPH Panitia, dan Oprek anggota
 * acara tempat dia Kadiv. Pemilu hanya untuk full/modul forms. Acara di Sampah tidak ikut.
 * Pemanggil wajib leftJoin events ke forms.eventId.
 */
function managedFormsScope(sa: SurveyAccess): SQL | undefined {
  const { access } = sa;
  const live = or(isNull(forms.eventId), isNull(events.deletedAt));
  if (access.isFull || access.canForms) return live;
  const ownSurvey = sa.canCreate
    ? and(
        eq(forms.kind, "survei"),
        eq(forms.createdBy, access.userId),
        sa.isCabinetMember
          ? undefined
          : access.committeeEventIds.length > 0
            ? inArray(forms.eventId, access.committeeEventIds)
            : sql`false`,
      )
    : sql`false`;
  const ownOprek = and(eq(forms.createdBy, access.userId), inArray(forms.kind, OPREK_KINDS));
  const asBphPanitia =
    access.bphEventIds.length > 0 ? and(inArray(forms.eventId, access.bphEventIds), ne(forms.kind, "pemilu")) : sql`false`;
  const asKadiv =
    access.kadivEventIds.length > 0
      ? and(eq(forms.kind, "oprek_kepanitiaan"), inArray(forms.eventId, access.kadivEventIds))
      : sql`false`;
  return and(live, or(ownSurvey, ownOprek, asBphPanitia, asKadiv));
}

export type DashboardFormRow = { id: string; title: string; kind: FormKind; closesAt: Date | null; entries: number };

/**
 * Untuk kartu Formulir di dashboard: formulir yang sedang dibuka (tutup paling dekat dulu)
 * dan jumlah lamaran Oprek yang belum diputuskan, keduanya dibatasi managedFormsScope.
 */
export async function getDashboardForms(
  sa: SurveyAccess,
): Promise<{ open: DashboardFormRow[]; openTotal: number; managedTotal: number; pendingOprek: number }> {
  const scope = managedFormsScope(sa);
  const [open, [managed], [pending]] = await Promise.all([
    db
      .select({
        id: forms.id,
        title: forms.title,
        kind: forms.kind,
        closesAt: forms.closesAt,
        // Formulir Kustom menyimpan jawaban di form_responses; Pemilu dan Oprek di form_applications.
        entries: sql<number>`(case when "forms"."kind" = 'survei'
          then (select count(*) from form_responses r where r.form_id = "forms"."id")
          else (select count(*) from form_applications a where a.form_id = "forms"."id") end)::int`,
        total: sql<number>`(count(*) over())::int`,
      })
      .from(forms)
      .leftJoin(events, eq(events.id, forms.eventId))
      .where(and(eq(forms.isOpen, true), scope))
      .orderBy(sql`${forms.closesAt} asc nulls last`, desc(forms.createdAt))
      .limit(3),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(forms)
      .leftJoin(events, eq(events.id, forms.eventId))
      .where(scope),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(formApplications)
      .innerJoin(forms, eq(forms.id, formApplications.formId))
      .leftJoin(events, eq(events.id, forms.eventId))
      .where(and(eq(formApplications.status, "pending"), inArray(forms.kind, OPREK_KINDS), scope)),
  ]);
  return {
    open: open.map((r) => ({ id: r.id, title: r.title, kind: r.kind, closesAt: r.closesAt, entries: r.entries })),
    openTotal: open[0]?.total ?? 0,
    managedTotal: managed?.n ?? 0,
    pendingOprek: pending?.n ?? 0,
  };
}
