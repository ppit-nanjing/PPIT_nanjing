import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { Target, Compass } from "lucide-react";

const MISI = [
  "Menambah dan memperluas program kerja dari PPIT Nanjing untuk menambah kesempatan mahasiswa dalam kota ini untuk interaksi dan saling connect.",
  "Menyusun struktur organisasi yang efisien dan jelas untuk mendukung misi pertama.",
  "Membangun koordinasi erat dan positif antara PPIT Cabang Nanjing dengan ranting dan PPI Tiongkok.",
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <header className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pt-16 pb-8">
        <span className="text-label-caps text-primary-container tracking-widest uppercase mb-2 block">
          Tentang Kami
        </span>
        <h1 className="text-headline-lg md:text-display-hero-mobile text-on-background mb-6">
          Tentang PPIT Nanjing
        </h1>
        <div className="max-w-3xl flex flex-col gap-4 text-body-lg text-on-surface-variant">
          <p>
            PPIT Cabang Nanjing adalah organisasi kemahasiswaan di Kota Nanjing yang mewadahi
            pelajar dan mahasiswa Indonesia serta organisasi-organisasi pelajar Indonesia di
            Tiongkok, khususnya Kota Nanjing. Organisasi ini dibentuk pada 28 Oktober 2008,
            bertepatan dengan Hari Sumpah Pemuda.
          </p>
          <p>
            Selain Kota Nanjing, PPIT Nanjing turut menaungi pelajar dan mahasiswa Indonesia di
            kota-kota sekitarnya: Xuzhou, Jurong, Ma&rsquo;anshan, Zhenjiang, dan Huai&rsquo;an,
            dengan dua ranting organisasi aktif setingkat kampus &mdash; INA di NUIST dan JIA di
            JSAHVC.
          </p>
        </div>
      </header>

      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-8">
            <Compass className="text-primary-container mb-4" size={28} />
            <h2 className="text-headline-md text-on-background mb-4">Visi</h2>
            <p className="text-body-md text-on-surface-variant">
              Meningkatkan pelayanan PPIT Nanjing kepada seluruh mahasiswa Indonesia di bawah
              naungannya; membuat PPIT Nanjing secara internal lebih efisien; dan menjadikan PPIT
              Nanjing sebagai organisasi yang memberikan kesempatan bagi setiap anggota kabinet
              untuk mengembangkan dan melatih kemampuan diri.
            </p>
          </div>
          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-8">
            <Target className="text-primary-container mb-4" size={28} />
            <h2 className="text-headline-md text-on-background mb-4">Misi</h2>
            <ol className="flex flex-col gap-3 text-body-md text-on-surface-variant list-decimal list-inside">
              {MISI.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ol>
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <a
            href="/organization"
            className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
          >
            Lihat Struktur Organisasi
          </a>
          <a
            href="/organization/branches"
            className="border border-outline-variant text-on-background text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-surface-container-low transition-colors"
          >
            Cabang Regional
          </a>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
