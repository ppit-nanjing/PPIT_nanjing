import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { AnimatedRevealText } from "@/components/animated-reveal-text";
import { AnimatedLettersHeading } from "@/components/animated-letters-heading";
import { MissionCards } from "@/components/mission-cards";
import { Reveal } from "@/components/reveal";
import { Compass, MapPinned, GraduationCap, CalendarDays, MapPin } from "lucide-react";

const COVERAGE_CITIES = ["Xuzhou", "Jurong", "Ma'anshan", "Zhenjiang", "Huai'an"];

const RANTING = [
  { name: "INA", campus: "NUIST" },
  { name: "JIA", campus: "JSAHVC" },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <header className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pt-20 sm:pt-24 pb-6 sm:pb-8">
        <span className="text-label-caps text-primary-container tracking-widest uppercase mb-2 block">
          Tentang Kami
        </span>
        <AnimatedLettersHeading
          as="h1"
          text="Tentang PPIT Nanjing"
          className="text-display-hero-mobile md:text-display-hero text-on-background mb-6"
        />
        <div className="max-w-3xl flex flex-col gap-4 text-body-lg text-on-surface-variant mb-6 sm:mb-8">
          <AnimatedRevealText text="PPIT Cabang Nanjing adalah organisasi kemahasiswaan di Kota Nanjing yang mewadahi pelajar dan mahasiswa Indonesia serta organisasi-organisasi pelajar Indonesia di Tiongkok, khususnya Kota Nanjing. Organisasi ini dibentuk pada 28 Oktober 2008, bertepatan dengan Hari Sumpah Pemuda." />
          <Reveal>
            <p>
              Selain Kota Nanjing, PPIT Nanjing turut menaungi pelajar dan mahasiswa Indonesia di
              kota-kota sekitarnya: Xuzhou, Jurong, Ma&rsquo;anshan, Zhenjiang, dan Huai&rsquo;an,
              dengan dua ranting organisasi aktif setingkat kampus &mdash; INA di NUIST dan JIA di
              JSAHVC.
            </p>
          </Reveal>
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
        <section className="mb-12 sm:mb-20">
          <Reveal>
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
              <div className="md:col-span-7">
                <MissionCards />
              </div>
            </div>
          </Reveal>
        </section>

        {/* Coverage area */}
        <section className="mb-10 sm:mb-16">
          <Reveal>
            <h2 className="text-headline-lg text-on-background mb-2">Wilayah Cakupan</h2>
            <p className="text-body-md text-on-surface-variant max-w-2xl mb-8">
              Selain mahasiswa di Kota Nanjing sendiri, PPIT Nanjing menaungi pelajar Indonesia di
              kota-kota sekitarnya serta dua ranting organisasi aktif setingkat kampus.
            </p>
            <div className="flex flex-col gap-4">
              <div className="bg-surface-container-low border border-outline-variant text-on-background rounded-xl p-6 sm:p-8">
                <div className="w-12 h-12 bg-primary-container/15 rounded-full flex items-center justify-center mb-4">
                  <MapPinned className="text-primary-container" size={22} />
                </div>
                <h3 className="text-headline-sm text-on-background mb-4">Kota Sekitar</h3>
                <div className="flex flex-wrap gap-2">
                  {COVERAGE_CITIES.map((c) => (
                    <span
                      key={c}
                      className="px-3 py-1.5 bg-primary-container/10 text-primary-container text-label-caps uppercase tracking-wide rounded-full"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {RANTING.map((r) => (
                  <div
                    key={r.name}
                    className="bg-surface-container-low border border-outline-variant rounded-xl p-6 flex items-center gap-4"
                  >
                    <div className="w-12 h-12 shrink-0 bg-primary-container/15 rounded-full flex items-center justify-center">
                      <GraduationCap className="text-primary-container" size={22} />
                    </div>
                    <div>
                      <p className="text-label-caps uppercase tracking-wide text-on-surface-variant mb-1">Ranting {r.name}</p>
                      <p className="text-headline-sm text-on-surface">{r.campus}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </section>

        <Reveal>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <a
              href="/organization"
              className="w-full sm:w-auto text-center bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
            >
              Lihat Struktur Organisasi
            </a>
            <a
              href="/organization/branches"
              className="w-full sm:w-auto text-center border border-outline-variant text-on-background text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-surface-container-low transition-colors"
            >
              Cabang Regional
            </a>
          </div>
        </Reveal>
      </main>

      <SiteFooter />
    </div>
  );
}
