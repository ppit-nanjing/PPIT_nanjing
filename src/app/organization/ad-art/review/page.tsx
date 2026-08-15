import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { organizationDocuments } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { Gavel, Download } from "lucide-react";

const SECTIONS = [
  { id: "kerangka-hukum", title: "Kerangka Hukum" },
  { id: "etika-anggota", title: "Etika Anggota" },
  { id: "peminjaman-inventaris", title: "Peminjaman Inventaris" },
  { id: "amandemen", title: "Amandemen" },
];

export default async function ReviewAdArtGuidelinesPage() {
  const [doc] = await db
    .select()
    .from(organizationDocuments)
    .where(eq(organizationDocuments.type, "ad_art"))
    .orderBy(desc(organizationDocuments.publishedAt))
    .limit(1);

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] py-16 grid grid-cols-1 md:grid-cols-12 gap-8">
        <aside className="md:col-span-3">
          <div className="sticky top-24 bg-surface-container-lowest border border-outline-variant rounded-lg p-6">
            <h3 className="text-label-caps uppercase tracking-wide text-on-surface-variant mb-4">Daftar Isi</h3>
            <ul className="flex flex-col gap-3 text-body-md">
              {SECTIONS.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="text-on-background hover:text-primary-container transition-colors">
                    {i + 1}. {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <article className="md:col-span-9 bg-surface-container-lowest border border-outline-variant rounded-xl p-6 md:p-12">
          <header className="mb-10 pb-8 border-b border-outline-variant">
            <div className="inline-flex items-center gap-2 bg-surface-container-high text-primary-container px-3 py-1 rounded-full text-label-caps uppercase mb-4">
              <Gavel size={14} /> Dokumen Resmi
            </div>
            <h1 className="text-headline-lg md:text-display-hero-mobile text-on-background mb-4">
              Tinjauan Panduan AD/ART
            </h1>
            <p className="text-quote-text text-on-surface-variant max-w-3xl">
              Aturan organisasi dan kerangka hukum yang mengatur operasional PPIT Nanjing, tata perilaku
              anggota, dan pengelolaan aset.
            </p>
          </header>

          <div className="flex flex-col gap-10">
            <section id="kerangka-hukum" className="scroll-mt-24">
              <h2 className="text-headline-lg text-on-background mb-4 flex items-center gap-3">
                <span className="bg-primary-container text-on-primary w-9 h-9 flex items-center justify-center rounded-md text-headline-md shrink-0">
                  1
                </span>
                Kerangka Hukum
              </h2>
              <div className="text-body-md text-on-surface-variant flex flex-col gap-4">
                <p>
                  Anggaran Dasar dan Anggaran Rumah Tangga (AD/ART) menjadi dokumen konstitusional utama
                  PPIT Nanjing. Panduan ini menetapkan prinsip dasar, tujuan, dan batasan hukum tempat
                  organisasi beroperasi.
                </p>
                <ul className="list-disc pl-6 flex flex-col gap-2 marker:text-primary-container">
                  <li>Memastikan kepatuhan terhadap standar organisasi pelajar Indonesia dan regulasi setempat di Nanjing.</li>
                  <li>Menetapkan struktur hierarki badan pengurus harian dan perwakilan divisi/regional.</li>
                  <li>Menetapkan protokol rapat resmi (Musyawarah Besar).</li>
                </ul>
              </div>
            </section>

            <hr className="border-t border-outline-variant" />

            <section id="etika-anggota" className="scroll-mt-24">
              <h2 className="text-headline-lg text-on-background mb-4 flex items-center gap-3">
                <span className="bg-primary-container text-on-primary w-9 h-9 flex items-center justify-center rounded-md text-headline-md shrink-0">
                  2
                </span>
                Etika Anggota
              </h2>
              <div className="text-body-md text-on-surface-variant flex flex-col gap-4">
                <p>
                  Seluruh anggota PPIT Nanjing diharapkan menjunjung tinggi integritas, keunggulan
                  akademik, dan saling menghormati.
                </p>
                <div className="bg-soft-gray p-6 rounded-md border-l-4 border-primary-container">
                  <h4 className="text-headline-md text-on-background mb-2">Kode Etik</h4>
                  <p className="mb-0">
                    Anggota wajib mengutamakan representasi diplomatik Indonesia selama menempuh studi di
                    luar negeri. Tindakan yang mencemarkan nama baik komunitas atau melanggar hukum
                    setempat akan ditinjau oleh pengurus.
                  </p>
                </div>
              </div>
            </section>

            <hr className="border-t border-outline-variant" />

            <section id="peminjaman-inventaris" className="scroll-mt-24">
              <h2 className="text-headline-lg text-on-background mb-4 flex items-center gap-3">
                <span className="bg-primary-container text-on-primary w-9 h-9 flex items-center justify-center rounded-md text-headline-md shrink-0">
                  3
                </span>
                Peminjaman Inventaris
              </h2>
              <div className="text-body-md text-on-surface-variant flex flex-col gap-4">
                <p>
                  Untuk mendukung kegiatan mahasiswa, PPIT Nanjing memelihara inventaris peralatan budaya
                  dan logistik. Protokol berikut mengatur proses peminjaman:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="border border-outline-variant p-5 rounded-md">
                    <h4 className="text-body-md font-semibold text-on-background mb-1">Pengajuan Peminjaman</h4>
                    <p className="text-body-md">
                      Pengajuan harus dikirim lewat{" "}
                      <a href="/inventory" className="text-primary-container underline">
                        portal resmi
                      </a>{" "}
                      minimal 48 jam sebelum tanggal yang dibutuhkan.
                    </p>
                  </div>
                  <div className="border border-outline-variant p-5 rounded-md">
                    <h4 className="text-body-md font-semibold text-on-background mb-1">Protokol Pengembalian</h4>
                    <p className="text-body-md">
                      Barang harus dikembalikan dalam kondisi semula. Kerusakan akan dikenakan tanggung
                      jawab finansial kepada peminjam.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <hr className="border-t border-outline-variant" />

            <section id="amandemen" className="scroll-mt-24">
              <h2 className="text-headline-lg text-on-background mb-4 flex items-center gap-3">
                <span className="bg-primary-container text-on-primary w-9 h-9 flex items-center justify-center rounded-md text-headline-md shrink-0">
                  4
                </span>
                Amandemen
              </h2>
              <div className="text-body-md text-on-surface-variant flex flex-col gap-4">
                <p>
                  Perubahan terhadap AD/ART hanya dapat disahkan melalui Musyawarah Besar dengan
                  persetujuan mayoritas anggota yang hadir. Usulan amandemen harus diajukan secara
                  tertulis kepada Badan Pengurus Harian minimal 14 hari sebelum musyawarah dilaksanakan.
                </p>
              </div>
            </section>
          </div>

          <div className="mt-12 pt-6 border-t border-outline-variant flex flex-wrap justify-between items-center gap-4">
            <p className="text-label-caps text-on-surface-variant">
              {doc ? `Terakhir diperbarui: versi ${doc.version ?? "terbaru"}` : "Dokumen resmi belum diunggah admin"}
            </p>
            {doc?.fileUrl && (
              <a
                href={doc.fileUrl}
                className="flex items-center gap-2 text-primary-container hover:text-primary transition-colors"
              >
                <Download size={16} /> Unduh AD/ART Lengkap
              </a>
            )}
          </div>
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}
