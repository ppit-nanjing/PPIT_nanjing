import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />
      <main className="max-w-3xl mx-auto px-[var(--spacing-container-padding)] py-16">
        <h1 className="text-headline-lg text-on-background mb-8">Kebijakan Privasi</h1>
        <div className="flex flex-col gap-6 text-body-md text-on-surface-variant">
          <p>
            PPIT Nanjing mengumpulkan data pribadi (nama, email, universitas, kontak, dan data
            sensus lainnya) semata-mata untuk keperluan operasional organisasi: pendataan
            mahasiswa, pendaftaran kegiatan, peminjaman inventaris, dan komunikasi resmi.
          </p>
          <section>
            <h2 className="text-headline-md text-on-background mb-2">Autentikasi</h2>
            <p>
              Masuk ke situs ini menggunakan akun Google. Kami hanya menerima nama, alamat email,
              dan foto profil dari akun Google Anda &mdash; kami tidak pernah menerima atau
              menyimpan kata sandi Google Anda.
            </p>
          </section>
          <section>
            <h2 className="text-headline-md text-on-background mb-2">Notifikasi Email</h2>
            <p>
              Kami hanya mengirimkan berita dan info kegiatan lewat email jika Anda secara aktif
              memilih untuk berlangganan. Anda dapat berhenti berlangganan kapan saja lewat halaman{" "}
              <a href="/profile" className="text-primary-container underline">
                Profil
              </a>
              .
            </p>
          </section>
          <section>
            <h2 className="text-headline-md text-on-background mb-2">Berbagi Data</h2>
            <p>
              Data Anda tidak dibagikan ke pihak ketiga di luar keperluan operasional PPIT Nanjing
              dan pelaporan ke PPI Tiongkok, kecuali diwajibkan oleh hukum yang berlaku.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
