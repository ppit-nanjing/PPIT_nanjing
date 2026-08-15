import { desc } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { recruitmentPeriods } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { Lock } from "lucide-react";
import { submitMembershipApplication } from "@/app/actions/membership";

export default async function JoinUsPage() {
  const [period] = await db.select().from(recruitmentPeriods).orderBy(desc(recruitmentPeriods.opensAt)).limit(1);
  const session = await auth();

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
          <p className="text-label-caps text-secondary uppercase mt-4">Data yang perlu disiapkan</p>
          <p className="text-body-sm text-on-surface-variant mt-1">
            Nama, Email, WhatsApp, Universitas, Jurusan, Perkiraan Lulus, Minat Divisi, Motivasi, Komitmen.
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
          <form action={submitMembershipApplication.bind(null, period.id)} className="flex flex-col gap-6">
            <label className="flex flex-col gap-2">
              <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Nama Lengkap *</span>
              <input
                type="text"
                name="fullName"
                required
                defaultValue={session?.user?.name ?? ""}
                className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Email *</span>
              <input
                type="email"
                name="email"
                required
                defaultValue={session?.user?.email ?? ""}
                className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">WhatsApp *</span>
              <input
                type="tel"
                name="whatsapp"
                required
                className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Universitas</span>
              <input
                type="text"
                name="university"
                className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Jurusan / Program Studi</span>
              <input
                type="text"
                name="major"
                className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Perkiraan Lulus (mis. Juni 2027)</span>
              <input
                type="text"
                name="expectedGraduation"
                className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Minat Divisi</span>
              <input
                type="text"
                name="divisionInterest"
                placeholder="mis. Hubungan Masyarakat, Teknologi, Logistik"
                className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Motivasi Bergabung</span>
              <textarea
                name="motivation"
                rows={5}
                className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container resize-none"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">
                Komitmen (kesiapan mengikuti kegiatan)
              </span>
              <textarea
                name="commitment"
                rows={3}
                className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container resize-none"
              />
            </label>
            <button
              type="submit"
              className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide py-3.5 rounded-md hover:bg-primary transition-colors"
            >
              Kirim Pendaftaran
            </button>
          </form>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
