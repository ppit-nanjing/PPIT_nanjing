import { desc } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { recruitmentPeriods } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { Lock } from "lucide-react";
import { submitMembershipApplication, getFormFields, getFormMeta } from "@/app/actions/membership";
import { MembershipApplicationForm } from "@/components/membership/membership-application-form";

export default async function JoinUsPage() {
  const [period] = await db.select().from(recruitmentPeriods).orderBy(desc(recruitmentPeriods.opensAt)).limit(1);
  const session = await auth();
  const fields = await getFormFields();
  const meta = await getFormMeta();

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <main className="max-w-xl mx-auto px-[var(--spacing-container-padding)] py-16">
        <h1 className="text-headline-lg text-on-background mb-2">Join Us</h1>
        <p className="text-body-md text-on-surface-variant mb-6">
          Bergabung menjadi pengurus PPIT Nanjing {period?.batchLabel ?? ""}.
        </p>

        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 mb-10">
          <h2 className="text-headline-md text-on-background mb-3">Panduan Pendaftaran</h2>
          <ol className="list-decimal list-inside space-y-2 text-body-md text-on-surface-variant">
            <li>Pastikan kamu mahasiswa Indonesia di Nanjing yang masih aktif kuliah.</li>
            <li>Isi formulir di bawah dengan data yang benar dan lengkap.</li>
            <li>Tuliskan motivasi &amp; komitmen dengan jelas agar panitia seleksi dapat menilai.</li>
            <li>Setelah mengirim, kamu akan mendapat kabar via email untuk tahap wawancara/oke.</li>
          </ol>
          <p className="text-label-caps text-secondary uppercase mt-4">Yang perlu disiapkan</p>
          <p className="text-body-sm text-on-surface-variant mt-1">
            Siapkan data diri dan jawaban motivasi/komitmen kamu. Field yang bertanda * wajib diisi.
          </p>
        </section>

        {!period || !period.isOpen ? (
          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-10 text-center">
            <div className="w-14 h-14 rounded-full bg-outline-variant/30 flex items-center justify-center mx-auto mb-6">
              <Lock className="text-secondary" size={24} />
            </div>
            <h2 className="text-headline-md text-on-background mb-3">Pendaftaran Sedang Ditutup</h2>
            <p className="text-body-md text-on-surface-variant mb-4">
              {period
                ? `Periode pendaftaran ${period.batchLabel} telah berakhir pada ${new Date(
                    period.closesAt!
                  ).toLocaleDateString("id-ID", { dateStyle: "long" })}.`
                : "Belum ada periode pendaftaran yang dibuka."}
            </p>
            <p className="text-label-caps text-secondary uppercase">
              Pantau Instagram @ppit_nanjing untuk info pendaftaran periode berikutnya
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="rounded-t-xl bg-primary-container px-6 py-6">
              <h2 className="text-headline-lg text-on-primary">{meta.title}</h2>
              {meta.description && <p className="text-body-md text-on-primary/80 mt-1">{meta.description}</p>}
            </div>
            <div className="-mt-4">
              <MembershipApplicationForm
                fields={fields}
                periodId={period.id}
                authenticated={Boolean(session?.user?.id)}
                defaults={
                  session?.user
                    ? {
                        fullName: session.user.name ?? "",
                        email: session.user.email ?? "",
                      }
                    : {}
                }
                action={submitMembershipApplication}
              />
            </div>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
