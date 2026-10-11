import { count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { events, formApplications, forms } from "@/db/schema";
import { FormCreate } from "@/components/console/forms/form-create";
import { FormList } from "@/components/console/forms/form-list";
import { FormsTabs } from "@/components/console/forms/forms-tabs";
import { requireBphTab } from "@/lib/form-access";

export const metadata = { title: "Formulir — Oprek BPH Acara" };

export default async function FormsOprekBphPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const access = await requireBphTab();
  const { error } = await searchParams;

  const [eventOptions, rows] = await Promise.all([
    db
      .select({ id: events.id, title: events.title, status: events.status })
      .from(events)
      .orderBy(sql`${events.startAt} desc nulls last`),
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
      .where(eq(forms.kind, "oprek_bph_acara"))
      .groupBy(forms.id, events.title)
      .orderBy(desc(forms.createdAt)),
  ]);

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10 max-w-5xl">
      <h1 className="text-headline-md sm:text-headline-lg text-on-background mb-6">Formulir</h1>
      <FormsTabs
        active="oprek-bph"
        showPendaftaran={access.canMembership}
        showPemilu={access.canPemilu}
        showBph={access.canBphTab}
        showKepanitiaan={access.canKepanitiaanTab}
      />

      <FormCreate kind="oprek_bph_acara" events={eventOptions} error={error ?? null} />
      <FormList rows={rows} emptyText="Belum ada formulir Oprek BPH Acara." />
    </div>
  );
}
