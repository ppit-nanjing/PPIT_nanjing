import { desc } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { recruitmentPeriods } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { Lock } from "lucide-react";
import Link from "next/link";
import { submitMembershipApplication, getFormFields } from "@/app/actions/membership";
import type { MembershipFieldDef } from "@/lib/membership-form";
import { ImageUploadCropper } from "@/components/upload/image-upload-cropper";

export default async function JoinUsPage() {
  const [period] = await db.select().from(recruitmentPeriods).orderBy(desc(recruitmentPeriods.opensAt)).limit(1);
  const session = await auth();
  const fields = await getFormFields();

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
          <form action={submitMembershipApplication.bind(null, period.id)} className="flex flex-col gap-6">
            {fields.map((f) => {
              const id = `field-${f.key}`;
              const common =
                "bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container";
              const defaultValue =
                f.key === "fullName"
                  ? session?.user?.name ?? ""
                  : f.key === "email"
                    ? session?.user?.email ?? ""
                    : undefined;
              return (
                <label key={f.id ?? f.key} htmlFor={id} className="flex flex-col gap-2">
                  <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">
                    {f.label}
                    {f.required && " *"}
                  </span>
                  {f.type === "textarea" ? (
                    <textarea
                      id={id}
                      name={f.key}
                      rows={f.key === "motivation" ? 5 : 3}
                      placeholder={f.placeholder}
                      defaultValue={defaultValue}
                      className={`${common} resize-none`}
                    />
                  ) : f.type === "select" ? (
                    <select id={id} name={f.key} defaultValue="" className={common}>
                      <option value="" disabled>
                        Pilih…
                      </option>
                      {(f.options ?? []).map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : f.type === "checkbox" ? (
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id={id}
                        name={f.key}
                        value="true"
                        className="h-5 w-5 accent-[color:var(--color-primary-container)]"
                      />
                      <span className="text-body-md text-on-surface-variant">{f.placeholder ?? "Centang jika ya"}</span>
                    </div>
                  ) : f.type === "image" ? (
                    session?.user?.id ? (
                      <ImageUploadCropper name={f.key} folder="membership" aspect={1} required={f.required} />
                    ) : (
                      <div className="flex flex-col gap-1 rounded-md border border-dashed border-outline-variant bg-soft-gray p-4">
                        <p className="text-body-sm text-on-surface-variant">
                          Untuk unggah gambar, silakan masuk terlebih dahulu.
                        </p>
                        <Link href="/login" className="text-body-sm text-primary-container underline">
                          Masuk
                        </Link>
                      </div>
                    )
                  ) : (
                    <input
                      id={id}
                      type={f.type}
                      name={f.key}
                      required={f.required}
                      placeholder={f.placeholder}
                      defaultValue={defaultValue}
                      className={common}
                    />
                  )}
                  {f.helpText && <span className="text-label-caps text-on-surface-variant">{f.helpText}</span>}
                </label>
              );
            })}
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
