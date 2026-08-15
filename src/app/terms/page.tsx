import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { LegalNav } from "@/components/legal-nav";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />
      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] py-16 flex flex-col md:flex-row gap-10">
        <LegalNav active="terms" />
        <article className="w-full max-w-3xl">
          <h1 className="text-headline-lg text-on-background mb-8">Syarat &amp; Ketentuan</h1>
          <div className="flex flex-col gap-6 text-body-md text-on-surface-variant">
            <p>
              Dengan menggunakan situs dan layanan PPIT Nanjing, Anda menyetujui untuk mematuhi
              syarat dan ketentuan berikut serta Anggaran Dasar &amp; Rumah Tangga (AD/ART) PPIT
              Nanjing yang berlaku.
            </p>
            <section>
              <h2 className="text-headline-md text-on-background mb-2">Keanggotaan</h2>
              <p>
                Keanggotaan PPIT Nanjing terbuka bagi pelajar dan mahasiswa Indonesia yang
                terdaftar secara resmi di wilayah kerja PPIT Nanjing, sebagaimana diatur dalam
                AD/ART dan panduan pendaftaran kepengurusan yang berlaku setiap periode.
              </p>
            </section>
            <section>
              <h2 className="text-headline-md text-on-background mb-2">Data Sensus</h2>
              <p>
                Data yang dikumpulkan melalui formulir Sensus digunakan untuk keperluan pendataan
                internal organisasi dan pelaporan kepada pihak terkait. Lihat{" "}
                <a href="/privacy" className="text-primary-container underline">
                  Kebijakan Privasi
                </a>{" "}
                untuk detail lebih lanjut.
              </p>
            </section>
            <section>
              <h2 className="text-headline-md text-on-background mb-2">Peminjaman Inventaris</h2>
              <p>
                Anggota yang meminjam inventaris organisasi bertanggung jawab penuh atas kondisi
                dan pengembalian tepat waktu barang yang dipinjam, sesuai kebijakan yang dikelola
                oleh Divisi Logistik.
              </p>
            </section>
          </div>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
