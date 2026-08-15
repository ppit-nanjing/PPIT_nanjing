import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { AnimatedRevealText } from "@/components/animated-reveal-text";
import { Target, Compass, Users, Layers, Handshake, MapPinned, GraduationCap, CalendarDays, MapPin } from "lucide-react";

const MISI = [
  {
    icon: Users,
    text: "Menambah dan memperluas program kerja dari PPIT Nanjing untuk menambah kesempatan mahasiswa dalam kota ini untuk interaksi dan saling connect.",
  },
  {
    icon: Layers,
    text: "Menyusun struktur organisasi yang efisien dan jelas untuk mendukung misi pertama.",
  },
  {
    icon: Handshake,
    text: "Membangun koordinasi erat dan positif antara PPIT Cabang Nanjing dengan ranting dan PPI Tiongkok.",
  },
];

const COVERAGE_CITIES = ["Xuzhou", "Jurong", "Ma'anshan", "Zhenjiang", "Huai'an"];

const RANTING = [
  { name: "INA", campus: "NUIST" },
  { name: "JIA", campus: "JSAHVC" },
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
        <div className="max-w-3xl flex flex-col gap-4 text-body-lg text-on-surface-variant mb-8">
          <AnimatedRevealText text="PPIT Cabang Nanjing adalah organisasi kemahasiswaan di Kota Nanjing yang mewadahi pelajar dan mahasiswa Indonesia serta organisasi-organisasi pelajar Indonesia di Tiongkok, khususnya Kota Nanjing. Organisasi ini dibentuk pada 28 Oktober 2008, bertepatan dengan Hari Sumpah Pemuda." />
          <p>
            Selain Kota Nanjing, PPIT Nanjing turut menaungi pelajar dan mahasiswa Indonesia di
            kota-kota sekitarnya: Xuzhou, Jurong, Ma&rsquo;anshan, Zhenjiang, dan Huai&rsquo;an,
            dengan dua ranting organisasi aktif setingkat kampus &mdash; INA di NUIST dan JIA di
            JSAHVC.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <span className="flex items-center gap-2 px-4 py-2 bg-surface-container-low text-on-surface text-label-caps uppercase tracking-wide rounded-full border border-outline-variant">
            <CalendarDays size={14} className="text-primary-container" /> Didirikan 28 Oktober 2008
          </span>
          <span className="flex items-center gap-2 px-4 py-2 bg-surface-container-low text-on-surface text-label-caps uppercase tracking-wide rounded-full border border-outline-variant">
            <MapPin size={14} className="text-primary-container" /> Nanjing, Tiongkok
          </span>
        </div>
      </header>

      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pb-24">
        {/* Vision & Mission — bento layout */}
        <section className="mb-20">
          <h2 className="text-headline-lg text-on-background mb-8">Visi &amp; Misi</h2>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-5 bg-primary-container text-on-primary p-8 md:p-10 rounded-xl flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 bg-on-primary/15 rounded-full flex items-center justify-center mb-6">
                  <Compass className="text-on-primary" size={22} />
                </div>
                <h3 className="text-headline-md mb-4">Visi</h3>
                <p className="text-body-md text-on-primary/90">
                  Meningkatkan pelayanan PPIT Nanjing kepada seluruh mahasiswa Indonesia di bawah
                  naungannya; membuat PPIT Nanjing secara internal lebih efisien; dan menjadikan
                  PPIT Nanjing sebagai organisasi yang memberikan kesempatan bagi setiap anggota
                  kabinet untuk mengembangkan dan melatih kemampuan diri.
                </p>
              </div>
            </div>
            <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-6">
              {MISI.map(({ icon: Icon, text }, i) => (
                <div
                  key={i}
                  className="bg-surface-container-low border border-outline-variant rounded-xl p-6 flex flex-col gap-3"
                >
                  <Icon className="text-primary-container" size={24} />
                  <p className="text-body-md text-on-surface-variant">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Coverage area */}
        <section className="mb-16">
          <h2 className="text-headline-lg text-on-background mb-2">Wilayah Cakupan</h2>
          <p className="text-body-md text-on-surface-variant max-w-2xl mb-8">
            Selain mahasiswa di Kota Nanjing sendiri, PPIT Nanjing menaungi pelajar Indonesia di
            kota-kota sekitarnya serta dua ranting organisasi aktif setingkat kampus.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-surface-container-low border border-outline-variant rounded-xl p-6">
              <MapPinned className="text-primary-container mb-3" size={22} />
              <h3 className="text-body-md font-bold text-on-surface mb-2">Kota Sekitar</h3>
              <ul className="flex flex-col gap-1 text-body-md text-on-surface-variant">
                {COVERAGE_CITIES.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
            {RANTING.map((r) => (
              <div key={r.name} className="bg-surface-container-low border border-outline-variant rounded-xl p-6">
                <GraduationCap className="text-primary-container mb-3" size={22} />
                <h3 className="text-body-md font-bold text-on-surface mb-2">Ranting {r.name}</h3>
                <p className="text-body-md text-on-surface-variant">{r.campus}</p>
              </div>
            ))}
          </div>
        </section>

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
