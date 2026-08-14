import { ArrowRight, Users, GraduationCap, CalendarDays, Quote } from "lucide-react";
import { AnimatedHeroHeading } from "@/components/animated-hero-heading";
import { AccountMenu } from "@/components/account-menu";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/events", label: "Events" },
  { href: "/news", label: "News" },
  { href: "/gallery", label: "Gallery" },
  { href: "/jobs", label: "Careers" },
];

// Real figures from the 2026/2027 recruitment guidebook (docs/Overview.md context),
// not the prototype's placeholder numbers.
const STATS = [
  { icon: Users, value: "600+", label: "Pelajar Aktif" },
  { icon: GraduationCap, value: "6", label: "Kota Naungan" },
  { icon: CalendarDays, value: "2008", label: "Berdiri Sejak" },
];

const CITIES = ["Nanjing", "Xuzhou", "Jurong", "Ma'anshan", "Zhenjiang", "Huai'an"];

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-on-background">
      <nav className="w-full sticky top-0 z-50 bg-surface shadow-[0_10px_30px_rgba(39,23,22,0.04)]">
        <div className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] flex justify-between items-center h-20">
          <span className="text-headline-md font-bold text-primary uppercase tracking-tight">
            PPIT Nanjing
          </span>
          <div className="hidden md:flex items-center gap-8 text-body-md">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-secondary font-medium hover:text-primary transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
          <AccountMenu />
        </div>
      </nav>

      <header className="relative w-full h-[600px] md:h-[680px] flex items-center justify-center overflow-hidden bg-on-background">
        {/* Layered depth: deep base -> directional glow -> decorative skyline silhouette.
            Placeholder for a licensed Nanjing photograph (see docs/Design System/Iconography & Imagery.md) -
            original vector art only, no hotlinked/unlicensed images. */}
        <div className="absolute inset-0 bg-gradient-to-b from-on-background via-primary/40 to-on-background" />
        <div className="absolute inset-0 [background:radial-gradient(circle_at_50%_20%,var(--color-primary-container)_0%,transparent_55%)] opacity-70" />
        <svg
          className="absolute bottom-0 left-0 w-full h-[45%] opacity-80"
          viewBox="0 0 1200 300"
          preserveAspectRatio="none"
          fill="none"
        >
          <path
            d="M0 300V180l60-20 20-40 20 40 40-60 40 60 20-30 20 30 80-90 80 90 30-40 30 40 60-70 60 70 40-50 40 50 60-30 60 30 40-60 40 60 60-20 60 20V300Z"
            fill="var(--color-on-background)"
            opacity="0.9"
          />
        </svg>
        <div className="absolute inset-0 opacity-[0.08] [background-image:radial-gradient(circle_at_20%_30%,white_1px,transparent_1px)] [background-size:24px_24px]" />

        <div className="relative z-10 text-center px-[var(--spacing-container-padding)] max-w-3xl mx-auto flex flex-col items-center">
          <span className="text-label-caps uppercase tracking-[0.2em] text-inverse-primary border border-inverse-primary/40 rounded-full px-4 py-1.5 mb-6">
            EST. 2008
          </span>
          <AnimatedHeroHeading
            words={["Menghubungkan", "Mahasiswa", "Indonesia", "di", "Nanjing"]}
            className="text-display-hero-mobile md:text-display-hero text-on-primary mb-[var(--spacing-stack-md)]"
          />
          <p className="text-body-lg text-on-primary-container mb-[var(--spacing-stack-md)] max-w-2xl">
            Wadah resmi Perhimpunan Pelajar Indonesia Tiongkok (PPIT) Cabang Nanjing untuk
            bersinergi, berkarya, dan berkontribusi bagi bangsa &mdash; sejak 2008.
          </p>
          <a
            href="/events"
            className="inline-flex items-center gap-2 bg-on-primary text-primary text-label-caps uppercase tracking-wide px-8 py-4 rounded-md hover:scale-105 transition-transform"
          >
            Jelajahi Kegiatan <ArrowRight size={18} />
          </a>
        </div>
      </header>

      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] flex flex-col gap-16 md:gap-[var(--spacing-section-gap)] py-16 md:py-[var(--spacing-section-gap)]">
        {/* Stats */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STATS.map(({ icon: Icon, value, label }) => (
            <div
              key={label}
              className="bg-surface-container-low rounded-lg p-10 flex flex-col items-center text-center border border-outline-variant"
            >
              <Icon className="text-primary-container mb-4" size={40} strokeWidth={1.5} />
              <h3 className="text-display-hero-mobile text-on-background mb-2">{value}</h3>
              <p className="text-label-caps text-on-surface-variant uppercase tracking-widest">
                {label}
              </p>
            </div>
          ))}
        </section>

        {/* Quote */}
        <section className="flex justify-center">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-[0_10px_30px_rgba(39,23,22,0.04)] max-w-4xl w-full p-10 md:p-16">
            <Quote className="text-primary-container mb-6" size={40} />
            <p className="text-quote-text text-on-surface italic mb-8">
              &ldquo;PPIT Nanjing adalah{" "}
              <span className="font-bold text-primary-container not-italic">
                rumah bagi ribuan mimpi
              </span>{" "}
              anak bangsa di kota bersejarah ini. Melalui{" "}
              <span className="font-bold text-primary-container not-italic">kolaborasi</span> dan
              semangat{" "}
              <span className="font-bold text-primary-container not-italic">gotong royong</span>,
              kita pastikan setiap pelajar Indonesia di sini memiliki support system terbaik untuk
              berkarya dan berkontribusi.&rdquo;
            </p>
            <h4 className="text-headline-md text-on-background mb-1">Ketua Umum PPIT Nanjing</h4>
            <p className="text-label-caps text-secondary uppercase">Periode 2026-2027</p>
          </div>
        </section>

        {/* Cities under PPIT Nanjing's umbrella */}
        <section className="flex flex-col gap-8">
          <div className="border-b border-outline-variant pb-6">
            <span className="text-label-caps text-primary-container tracking-widest uppercase mb-2 block">
              Jangkauan Wilayah
            </span>
            <h2 className="text-headline-lg text-on-background">Kota di Bawah Naungan PPIT Nanjing</h2>
            <p className="text-body-md text-on-surface-variant mt-3 max-w-2xl">
              Selain Kota Nanjing, PPIT Nanjing turut menaungi pelajar dan mahasiswa Indonesia di
              kota-kota sekitarnya, termasuk dua ranting organisasi aktif: INA (NUIST) dan JIA
              (JSAHVC).
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {CITIES.map((city) => (
              <div
                key={city}
                className="bg-surface-container-low border border-outline-variant rounded-md px-6 py-5 text-center text-body-md font-medium"
              >
                {city}
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="w-full bg-inverse-surface text-inverse-on-surface py-12 mt-16">
        <div className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] flex flex-col md:flex-row justify-between items-center gap-6">
          <span className="text-headline-md font-bold uppercase">PPIT Nanjing</span>
          <div className="text-body-md flex gap-2 flex-wrap justify-center">
            {NAV_LINKS.map((link, i) => (
              <span key={link.href}>
                <a href={link.href} className="hover:text-primary-fixed-dim transition-colors">
                  {link.label}
                </a>
                {i < NAV_LINKS.length - 1 && <span className="mx-2 opacity-40">|</span>}
              </span>
            ))}
          </div>
          <p className="text-label-caps opacity-70">&copy; 2026 PPIT Nanjing</p>
        </div>
      </footer>
    </div>
  );
}
