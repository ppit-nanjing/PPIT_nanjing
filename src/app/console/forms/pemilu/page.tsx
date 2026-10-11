import { Vote } from "lucide-react";
import { FormsTabs } from "@/components/console/forms/forms-tabs";
import { requirePemiluTab } from "@/lib/form-access";

export const metadata = { title: "Formulir — Pemilu" };

export default async function FormsPemiluPage() {
  const access = await requirePemiluTab();

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

      <div className="flex flex-col items-center text-center py-16 bg-surface-container-lowest border border-[var(--deco-line)] border-dashed rounded-lg px-6">
        <Vote className="text-outline-variant mb-4" size={36} aria-hidden />
        <h2 className="text-headline-md text-on-background mb-2">Belum ada formulir Pemilu</h2>
        <p className="text-body-md text-on-surface-variant max-w-md">
          Formulir pendaftaran calon untuk periode berikutnya akan tampil di sini.
        </p>
      </div>
    </div>
  );
}
