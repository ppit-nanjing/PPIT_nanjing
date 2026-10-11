import { Crown } from "lucide-react";
import { FormsTabs } from "@/components/console/forms/forms-tabs";
import { requireBphTab } from "@/lib/form-access";

export const metadata = { title: "Formulir — Oprek BPH Acara" };

export default async function FormsOprekBphPage() {
  const access = await requireBphTab();

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

      <div className="flex flex-col items-center text-center py-16 bg-surface-container-lowest border border-[var(--deco-line)] border-dashed rounded-lg px-6">
        <Crown className="text-outline-variant mb-4" size={36} aria-hidden />
        <h2 className="text-headline-md text-on-background mb-2">Belum ada formulir Oprek BPH Acara</h2>
        <p className="text-body-md text-on-surface-variant max-w-md">
          Formulir rekrutmen BPH Acara per acara/proker akan tampil di sini.
        </p>
      </div>
    </div>
  );
}
