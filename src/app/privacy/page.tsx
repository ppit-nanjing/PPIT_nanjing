import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { LegalNav } from "@/components/legal-nav";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />
      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] py-16 flex flex-col md:flex-row gap-10">
        <LegalNav active="privacy" />
        <article className="w-full max-w-3xl">
          <h1 className="text-headline-lg text-on-background mb-8">Kebijakan Privasi</h1>
          <div className="flex flex-col gap-6 text-body-md text-on-surface-variant">
            <p>
              PPIT Nanjing berkomitmen untuk melindungi data pribadi anggota dan pengguna. Kebijakan
              ini menjelaskan data apa yang kami kumpulkan, bagaimana data tersebut digunakan, serta
              hak Anda terkait data Anda. Dengan menggunakan layanan kami, Anda menyetujui pengolahan
              data sebagaimana diuraikan berikut.
            </p>
            <section>
              <h2 className="text-headline-md text-on-background mb-2">Data yang Kami Kumpulkan</h2>
              <p>
                Kami mengumpulkan data pribadi yang Anda berikan secara langsung, meliputi nama
                lengkap, alamat email, nomor telepon (jika diisi), universitas, program studi, dan
                data sensus lainnya (seperti lokasi, status keanggotaan, dan minat kegiatan). Kami
                juga mencatat informasi teknis dasar seperti waktu akses dan jenis perangkat demi
                keamanan layanan.
              </p>
            </section>
            <section>
              <h2 className="text-headline-md text-on-background mb-2">Autentikasi</h2>
              <p>
                Masuk ke situs ini menggunakan akun Google. Kami hanya menerima nama, alamat
                email, dan foto profil dari akun Google Anda &mdash; kami tidak pernah menerima
                atau menyimpan kata sandi Google Anda.
              </p>
            </section>
            <section>
              <h2 className="text-headline-md text-on-background mb-2">Bagaimana Data Digunakan</h2>
              <p>
                Data yang dikumpulkan digunakan semata-mata untuk keperluan operasional organisasi:
                pendataan mahasiswa Indonesia di Tiongkok, pendaftaran dan pengelolaan kegiatan,
                peminjaman inventaris, penyampaian informasi resmi, serta pelaporan internal kepada
                PPIT Pusat dan PPI Tiongkok. Kami tidak menggunakan data untuk tujuan komersial di
                luar organisasi.
              </p>
            </section>
            <section>
              <h2 className="text-headline-md text-on-background mb-2">Notifikasi Email</h2>
              <p>
                Kami hanya mengirimkan berita dan info kegiatan lewat email jika Anda secara aktif
                memilih untuk berlangganan. Anda dapat berhenti berlangganan kapan saja lewat
                halaman{" "}
                <a href="/profile" className="text-primary-container underline">
                  Profil
                </a>
                .
              </p>
            </section>
            <section>
              <h2 className="text-headline-md text-on-background mb-2">Penyimpanan &amp; Keamanan</h2>
              <p>
                Data disimpan pada sistem yang aman dan hanya dapat diakses oleh pengurus yang
                berwenang sesuai tugasnya. Kami menerapkan langkah-langkah perlindungan yang wajar
                untuk mencegah akses tidak sah, namun tidak dapat menjamin keamanan mutlak pada
                lingkungan internet.
              </p>
            </section>
            <section>
              <h2 className="text-headline-md text-on-background mb-2">Berbagi Data</h2>
              <p>
                Data Anda tidak dibagikan ke pihak ketiga di luar keperluan operasional PPIT
                Nanjing dan pelaporan ke PPI Tiongkok, kecuali diwajibkan oleh hukum yang berlaku.
              </p>
            </section>
            <section>
              <h2 className="text-headline-md text-on-background mb-2">Hak Anda &amp; Kontak</h2>
              <p>
                Anda berhak meminta akses, perbaikan, atau penghapusan data pribadi Anda. Untuk
                pertanyaan terkait kebijakan privasi ini atau pengajuan permintaan data, silakan
                hubungi pengurus PPIT Nanjing melalui surel resmi di{" "}
                <a href="/profile" className="text-primary-container underline">
                  Profil
                </a>{" "}
                atau kanal komunikasi resmi organisasi.
              </p>
            </section>
          </div>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
