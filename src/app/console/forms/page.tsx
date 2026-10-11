import { count } from "drizzle-orm";
import { ClipboardList, Crown, UserPlus, Vote } from "lucide-react";
import Link from "next/link";
import { db } from "@/db";
import { forms, membershipApplications } from "@/db/schema";
import { requireFormsHub } from "@/lib/form-access";

export const metadata = { title: "Formulir" };

// Hub modul Formulir: 4 pintu (Pendaftaran PPIT lama + 3 formulir kabinet).
// Isi tiap tab dibangun bertahap — lihat docs/Formulir & Oprek.md.
export default async function ConsoleFormsPage() {
  const access = await requireFormsHub();

  const [formCounts, membershipCountRows] = await Promise.all([
    db.select({ kind: forms.kind, n: count() }).from(forms).groupBy(forms.kind),
    access.canMembership ? db.select({ n: count() }).from(membershipApplications) : Promise.resolve([]),
  ]);
  const countOf = (kind: string) => formCounts.find((c) => c.kind === kind)?.n ?? 0;
  const membershipCount = membershipCountRows[0]?.n ?? 0;

  const cardClass =
    "flex flex-col gap-2 bg-surface-container-lowest border border-outline-variant rounded-lg p-6 hover:border-muted-gold hover:bg-surface-container-low transition-colors";
  const countClass = "text-label-caps uppercase tracking-wide text-on-surface-variant";

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-headline-md sm:text-headline-lg text-on-background">Formulir</h1>
        <p className="text-body-md text-on-surface-variant mt-1">
          Formulir internal kabinet PPIT: pendaftaran anggota, Pemilu, Oprek BPH Acara, dan Oprek Kepanitiaan.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {access.canMembership && (
          <Link href="/console/forms/pendaftaran" className={cardClass}>
            <span className="flex items-center gap-2 text-on-background">
              <UserPlus size={18} className="text-primary-container" />
              <span className="text-headline-md">Pendaftaran PPIT</span>
            </span>
            <span className="text-body-md text-on-surface-variant">
              Formulir rekrutmen anggota (halaman Join Us): kelola pertanyaan, respons, dan ekspor.
            </span>
            <span className={countClass}>{membershipCount} jawaban</span>
          </Link>
        )}

        {access.canPemilu && (
          <Link href="/console/forms/pemilu" className={cardClass}>
            <span className="flex items-center gap-2 text-on-background">
              <Vote size={18} className="text-primary-container" />
              <span className="text-headline-md">Pemilu</span>
            </span>
            <span className="text-body-md text-on-surface-variant">
              Pendaftaran calon untuk kepengurusan periode berikutnya. Khusus pengurus kabinet.
            </span>
            <span className={countClass}>{countOf("pemilu")} formulir</span>
          </Link>
        )}

        {access.canBphTab && (
          <Link href="/console/forms/oprek-bph" className={cardClass}>
            <span className="flex items-center gap-2 text-on-background">
              <Crown size={18} className="text-primary-container" />
              <span className="text-headline-md">Oprek BPH Acara</span>
            </span>
            <span className="text-body-md text-on-surface-variant">
              Rekrut BPH Acara (ketua, wakil, sekretaris, bendahara, supervisor) untuk satu acara/proker.
            </span>
            <span className={countClass}>{countOf("oprek_bph_acara")} formulir</span>
          </Link>
        )}

        {access.canKepanitiaanTab && (
          <Link href="/console/forms/oprek-kepanitiaan" className={cardClass}>
            <span className="flex items-center gap-2 text-on-background">
              <ClipboardList size={18} className="text-primary-container" />
              <span className="text-headline-md">Oprek Kepanitiaan</span>
            </span>
            <span className="text-body-md text-on-surface-variant">
              Rekrut panitia acara per divisi. Dibuat BPH Acara setelah BPH-nya terbentuk.
            </span>
            <span className={countClass}>{countOf("oprek_kepanitiaan")} formulir</span>
          </Link>
        )}
      </div>
    </div>
  );
}
