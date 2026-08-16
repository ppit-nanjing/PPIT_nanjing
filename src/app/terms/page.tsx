import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { LegalNav } from "@/components/legal-nav";
import Link from "next/link";

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
              Nanjing yang berlaku. Apabila Anda tidak menyetujui ketentuan ini, mohon untuk tidak
              menggunakan layanan kami.
            </p>
            <section>
              <h2 className="text-headline-md text-on-background mb-2">Kelayakan Keanggotaan</h2>
              <p>
                Keanggotaan PPIT Nanjing terbuka bagi pelajar dan mahasiswa Indonesia yang
                terdaftar secara resmi di perguruan tinggi di wilayah kerja PPIT Nanjing, sebagaimana
                diatur dalam AD/ART dan panduan pendaftaran kepengurusan yang berlaku setiap periode.
                Calon anggota wajib mengisi data diri secara benar dan diperbarui apabila terjadi
                perubahan status akademik atau kontak. PPIT Nanjing berhak menolak atau mengakhiri
                keanggotaan apabila syarat kelayakan tidak lagi terpenuhi.
              </p>
            </section>
            <section>
              <h2 className="text-headline-md text-on-background mb-2">Kode Etik &amp; Tata Tertib</h2>
              <p>
                Setiap anggota dan pengguna wajib menjunjung tinggi nilai-nilai PPIT Nanjing,
                menghormati sesama anggota, serta menjaga nama baik organisasi dan Indonesia. Dilarang
                menggunakan layanan untuk menyebarkan konten yang bersifat diskriminatif, melecehkan,
                melanggar hukum yang berlaku di Tiongkok maupun di Indonesia, atau merugikan pihak
                lain. Pelanggaran terhadap kode etik dapat dikenakan sanksi mulai dari teguran hingga
                pencabutan akses sesuai keputusan kepengurusan.
              </p>
            </section>
            <section>
              <h2 className="text-headline-md text-on-background mb-2">Tanggung Jawab Akun</h2>
              <p>
                Anda bertanggung jawab penuh atas keamanan akun dan segala aktivitas yang dilakukan
                melalui akun Anda, termasuk akses terhadap data pribadi, pendaftaran kegiatan, dan
                peminjaman inventaris. Segera laporkan kepada pengurus apabila terdapat aktivitas
                mencurigakan pada akun Anda. PPIT Nanjing tidak bertanggung jawab atas kerugian yang
                timbul akibat kelalaian pengguna dalam menjaga kerahasiaan atau keamanan akunnya.
              </p>
            </section>
            <section>
              <h2 className="text-headline-md text-on-background mb-2">Konten &amp; Hak Kekayaan Intelektual</h2>
              <p>
                Seluruh konten yang dipublikasikan melalui situs ini, termasuk dokumen, berita, dan
                materi kegiatan, merupakan milik PPIT Nanjing atau pihak yang berhak kecuali dinyatakan
                lain. Pengguna diperkenankan membagikan konten untuk keperluan non-komersial dengan
                menyertakan atribusi yang layak. Konten yang diunggah oleh pengguna menjadi tanggung
                jawab penuh pengguna terkait dan harus tunduk pada kode etik serta ketentuan hukum
                yang berlaku.
              </p>
            </section>
            <section>
              <h2 className="text-headline-md text-on-background mb-2">Data Sensus</h2>
              <p>
                Data yang dikumpulkan melalui formulir Sensus digunakan untuk keperluan pendataan
                internal organisasi dan pelaporan kepada pihak terkait. Lihat{" "}
                <Link href="/privacy" className="text-primary-container underline rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background">
                  Kebijakan Privasi
                </Link>{" "}
                untuk detail lebih lanjut.
              </p>
            </section>
            <section>
              <h2 className="text-headline-md text-on-background mb-2">Peminjaman Inventaris</h2>
              <p>
                Anggota yang meminjam inventaris organisasi bertanggung jawab penuh atas kondisi
                dan pengembalian tepat waktu barang yang dipinjam, sesuai kebijakan yang dikelola
                oleh Divisi Logistik. Kerusakan atau kehilangan akibat kelalaian akan ditanggung
                sesuai ketentuan yang berlaku.
              </p>
            </section>
            <section>
              <h2 className="text-headline-md text-on-background mb-2">Perubahan Ketentuan</h2>
              <p>
                PPIT Nanjing dapat memperbarui syarat dan ketentuan ini dari waktu ke waktu. Versi
                terbaru akan dipublikasikan melalui halaman ini, dan penggunaan layanan yang berlanjut
                setelah pembaruan dianggap sebagai persetujuan terhadap perubahan tersebut.
              </p>
            </section>
          </div>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
