import { BookOpen, ListChecks, Settings2 } from "lucide-react";
import Link from "next/link";
import { FormsTabs } from "@/components/console/forms/forms-tabs";
import { requireFormsHub } from "@/lib/form-access";

export const metadata = { title: "Formulir — Pendaftaran PPIT" };

// Tab Pendaftaran PPIT: pintasan ke modul /console/membership yang sudah ada
// (tidak dibongkar). Hanya tampil untuk pemegang modul membership.
export default async function FormsPendaftaranPage() {
  const access = await requireFormsHub();

  const cardClass =
    "flex items-start gap-3 bg-surface-container-lowest border border-outline-variant rounded-lg p-6 hover:border-muted-gold hover:bg-surface-container-low transition-colors";

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10 max-w-5xl">
      <h1 className="text-headline-md sm:text-headline-lg text-on-background mb-6">Formulir</h1>
      <FormsTabs
        active="pendaftaran"
        showPendaftaran={access.canMembership}
        showPemilu={access.canPemilu}
        showBph={access.canBphTab}
        showKepanitiaan={access.canKepanitiaanTab}
      />

      {access.canMembership ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link href="/console/membership" className={cardClass}>
            <Settings2 size={20} className="text-primary-container shrink-0 mt-0.5" />
            <span>
              <span className="block text-body-md font-semibold text-on-background">Daftar &amp; Periode</span>
              <span className="block text-body-sm text-on-surface-variant">
                Lamaran yang masuk dan buka/tutup periode pendaftaran.
              </span>
            </span>
          </Link>
          <Link href="/console/membership/form" className={cardClass}>
            <BookOpen size={20} className="text-primary-container shrink-0 mt-0.5" />
            <span>
              <span className="block text-body-md font-semibold text-on-background">Formulir</span>
              <span className="block text-body-sm text-on-surface-variant">
                Susun pertanyaan, atur setelan, dan lihat pratinjau.
              </span>
            </span>
          </Link>
          <Link href="/console/membership/responses" className={cardClass}>
            <ListChecks size={20} className="text-primary-container shrink-0 mt-0.5" />
            <span>
              <span className="block text-body-md font-semibold text-on-background">Jawaban</span>
              <span className="block text-body-sm text-on-surface-variant">Lihat semua jawaban dan ekspor CSV.</span>
            </span>
          </Link>
        </div>
      ) : (
        <p className="text-body-md text-on-surface-variant rounded-lg bg-surface-container-low px-4 py-3">
          Kamu tidak punya akses modul Pendaftaran Anggota. Hubungi admin penuh kalau memang perlu.
        </p>
      )}
    </div>
  );
}
