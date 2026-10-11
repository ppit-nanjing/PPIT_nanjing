import { count, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { events, formApplications, forms } from "@/db/schema";
import { FormCreate } from "@/components/console/forms/form-create";
import { FormList } from "@/components/console/forms/form-list";
import { FormsTabs } from "@/components/console/forms/forms-tabs";
import { requireKepanitiaanTab } from "@/lib/form-access";

export const metadata = { title: "Formulir — Oprek Kepanitiaan" };

export default async function FormsOprekKepanitiaanPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const access = await requireKepanitiaanTab();
  const { error } = await searchParams;

  const canCreateForAnyEvent = access.isFull || access.canForms;
  const eventQuery = db
    .select({ id: events.id, title: events.title, status: events.status })
    .from(events)
    .orderBy(sql`${events.startAt} desc nulls last`);

  const [eventOptions, rows] = await Promise.all([
    canCreateForAnyEvent
      ? eventQuery
      : access.bphEventIds.length > 0
        ? eventQuery.where(inArray(events.id, access.bphEventIds))
        : Promise.resolve([] as { id: string; title: string; status: string }[]),
    db
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
      .where(eq(forms.kind, "oprek_kepanitiaan"))
      .groupBy(forms.id, events.title)
      .orderBy(desc(forms.createdAt)),
  ]);

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

      {eventOptions.length > 0 ? (
        <FormCreate kind="oprek_kepanitiaan" events={eventOptions} error={error ?? null} />
      ) : (
        <p className="text-body-md text-on-surface-variant rounded-lg bg-surface-container-low px-4 py-3 mb-8">
          Kamu belum tercatat sebagai BPH Acara di acara mana pun. Formulir Oprek Kepanitiaan dibuat oleh BPH Acara
          setelah terbentuk lewat Oprek BPH.
        </p>
      )}

      <FormList rows={rows} emptyText="Belum ada formulir Oprek Kepanitiaan." />
    </div>
  );
}
