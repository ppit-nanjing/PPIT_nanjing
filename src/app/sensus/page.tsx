import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { sensusProfiles } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { SensusWizard } from "@/components/sensus/sensus-wizard";
import { ShieldCheck } from "lucide-react";

export default async function SensusPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;
  const session = await auth();
  if (!session?.user?.id) redirect(returnTo ? `/login` : "/login");

  const [existing] = await db.select().from(sensusProfiles).where(eq(sensusProfiles.userId, session.user.id));

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />
      <main className="max-w-xl mx-auto px-[var(--spacing-container-padding)] py-16">
        <h1 className="text-headline-lg text-on-background mb-2">Sensus PPI Tiongkok</h1>
        <p className="text-body-md text-on-surface-variant mb-6">
          {existing
            ? "Perbarui data sensus kamu kapan saja."
            : "Lengkapi data pendataan mahasiswa Indonesia di Tiongkok. Data ini digunakan untuk pelaporan internal PPIT Nanjing."}
        </p>

        {returnTo && existing?.completionStatus !== "complete" && (
          <div className="flex items-start gap-3 bg-primary-container/10 border border-primary-container/20 rounded-lg p-4 mb-8">
            <ShieldCheck className="text-primary-container shrink-0 mt-0.5" size={18} />
            <p className="text-body-md text-on-background">
              Untuk melamar kerja, meminjam barang, atau mendaftar kegiatan, kamu perlu menyelesaikan data
              sensus terlebih dahulu sebagai verifikasi identitas. Setelah disimpan, kamu akan diarahkan
              kembali otomatis.
            </p>
          </div>
        )}

        <SensusWizard
          returnTo={returnTo}
          initial={{
            gender: existing?.gender ?? "",
            birthDate: existing?.birthDate ?? "",
            university: existing?.university ?? "",
            program: existing?.program ?? "",
            degreeLevel: existing?.degreeLevel ?? "",
            cityInChina: existing?.cityInChina ?? "",
            arrivalDate: existing?.arrivalDate ?? "",
            visaType: existing?.visaType ?? "",
            scholarshipType: existing?.scholarshipType ?? "",
            emergencyContactName: existing?.emergencyContactName ?? "",
            emergencyContactPhone: existing?.emergencyContactPhone ?? "",
          }}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
