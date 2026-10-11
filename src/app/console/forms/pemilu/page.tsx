import { count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { events, formApplications, forms } from "@/db/schema";
import { FormCreate } from "@/components/console/forms/form-create";
import { FormList } from "@/components/console/forms/form-list";
import { FormsTabs } from "@/components/console/forms/forms-tabs";
import { requirePemiluTab } from "@/lib/form-access";

export const metadata = { title: "Formulir — Pemilu" };

export default async function FormsPemiluPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const access = await requirePemiluTab();
  const { error } = await searchParams;

  const rows = await db
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
    .where(eq(forms.kind, "pemilu"))
    .groupBy(forms.id, events.title)
    .orderBy(desc(forms.createdAt));

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10 max-w-5xl">
      <h1 className="text-headline-md sm:text-headline-lg text-on-background mb-6">Formulir</h1>
      <FormsTabs
        active="pemilu"
        showPendaftaran={access.canMembership}
        showPemilu={access.canPemilu}
        showBph={access.canBphTab}
        showKepanitiaan={access.canKepanitiaanTab}
      />

      <FormCreate kind="pemilu" error={error ?? null} />
      <FormList rows={rows} emptyText="Belum ada formulir Pemilu." />
    </div>
  );
}
