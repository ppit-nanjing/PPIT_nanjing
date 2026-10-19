import { and, count, desc, eq, inArray, isNotNull, isNull, notInArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { events, formApplications, forms } from "@/db/schema";
import { FormCreate } from "@/components/console/forms/form-create";
import { FormList } from "@/components/console/forms/form-list";
import { FormsTabs } from "@/components/console/forms/forms-tabs";
import { requireKepanitiaanTab } from "@/lib/form-access";

export const metadata = { title: "Formulir — Oprek Kepanitiaan" };

type EventOption = { id: string; title: string; status: string };

// Tab Kepanitiaan memuat dua jenis form berdivisi, berurutan sesuai alur
// rekrutmen acara: Oprek Kadiv (dibuat & diputuskan BPH Acara) lalu Oprek
// anggota (satu form untuk semua divisi; dibuat BPH Acara atau Kadiv, dan semua
// Kadiv ikut memutuskan). Hak akses sebenarnya tetap di server (createForm,
// requireFormManage) — halaman ini hanya menyaring pilihan & daftar.
export default async function FormsOprekKepanitiaanPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const access = await requireKepanitiaanTab();
  const { error } = await searchParams;

  const canCreateForAnyEvent = access.isFull || access.canForms;
  // Acara yang boleh dikelola pemakai ini di tab ini (BPH Acara ∪ Kadiv).
  const managedEventIds = [...new Set([...access.bphEventIds, ...access.kadivEventIds])];

  // Acara yang BELUM punya form jenis `kind` (satu acara satu form per jenis),
  // dibatasi ke `allowed` kalau pemakai bukan full/modul.
  function eventOptionsFor(kind: "oprek_kadiv" | "oprek_kepanitiaan", allowed: string[] | null) {
    if (allowed !== null && allowed.length === 0) return Promise.resolve([] as EventOption[]);
    return db
      .select({ id: events.id, title: events.title, status: events.status })
      .from(events)
      .where(
        and(
          isNull(events.deletedAt),
          allowed === null ? undefined : inArray(events.id, allowed),
          notInArray(
            events.id,
            db
              .select({ eventId: forms.eventId })
              .from(forms)
              .where(and(eq(forms.kind, kind), isNotNull(forms.eventId))),
          ),
        ),
      )
      .orderBy(sql`${events.startAt} desc nulls last`);
  }

  const rowsQuery =
    canCreateForAnyEvent || managedEventIds.length > 0
      ? db
          .select({
            id: forms.id,
            title: forms.title,
            kind: forms.kind,
            isOpen: forms.isOpen,
            eventTitle: events.title,
            applicants: count(formApplications.id),
          })
          .from(forms)
          .leftJoin(events, eq(events.id, forms.eventId))
          .leftJoin(formApplications, eq(formApplications.formId, forms.id))
          .where(
            and(
              inArray(forms.kind, ["oprek_kadiv", "oprek_kepanitiaan"]),
              isNull(events.deletedAt),
              // BPH Acara / Kadiv hanya melihat rekrutmen acaranya sendiri.
              canCreateForAnyEvent ? undefined : inArray(forms.eventId, managedEventIds),
              // Kadiv tidak melihat Oprek Kadiv acaranya kecuali dia juga BPH.
              canCreateForAnyEvent
                ? undefined
                : or(
                    eq(forms.kind, "oprek_kepanitiaan"),
                    access.bphEventIds.length > 0 ? inArray(forms.eventId, access.bphEventIds) : undefined,
                  ),
            ),
          )
          .groupBy(forms.id, events.title)
          .orderBy(desc(forms.createdAt))
      : Promise.resolve([]);

  const [kadivEventOptions, memberEventOptions, rows] = await Promise.all([
    eventOptionsFor("oprek_kadiv", canCreateForAnyEvent ? null : access.bphEventIds),
    eventOptionsFor("oprek_kepanitiaan", canCreateForAnyEvent ? null : managedEventIds),
    rowsQuery,
  ]);
  const canCreateKadiv = canCreateForAnyEvent || access.bphEventIds.length > 0;

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10 max-w-5xl">
      <h1 className="text-headline-md sm:text-headline-lg text-on-background mb-6">Formulir</h1>
      <FormsTabs
        active="oprek-kepanitiaan"
        showPendaftaran={access.canMembership}
        showPemilu={access.canPemilu}
        showBph={access.canBphTab}
        showKepanitiaan={access.canKepanitiaanTab}
      />

      <p className="text-body-md text-on-surface-variant mb-6 max-w-3xl">
        Urutan rekrutmen acara: <strong className="text-on-background">Oprek BPH</strong> →{" "}
        <strong className="text-on-background">Oprek Kadiv</strong> (BPH Acara memilih ketua tiap divisi) →{" "}
        <strong className="text-on-background">Oprek anggota</strong> (satu formulir untuk semua divisi; BPH Acara dan
        semua Kadiv ikut menilai). Divisi pilihan diambil dari Struktur Kepanitiaan acara, jadi buat divisinya dulu.
      </p>

      {/* FormCreate menampilkan catatan sendiri kalau picker-nya kosong. */}
      {canCreateKadiv && <FormCreate kind="oprek_kadiv" events={kadivEventOptions} error={error ?? null} />}
      <FormCreate kind="oprek_kepanitiaan" events={memberEventOptions} error={error ?? null} />

      <FormList rows={rows} emptyText="Belum ada formulir Oprek Kadiv atau Oprek anggota." />
    </div>
  );
}
