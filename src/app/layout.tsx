import type { Metadata } from "next";
import {
  Plus_Jakarta_Sans,
  Spectral,
  Poppins,
  Fredoka,
  Bebas_Neue,
  Caveat,
  Inter,
  Manrope,
  Playfair_Display,
  Lora,
  Merriweather,
  Anton,
  Oswald,
  Baloo_2,
  Quicksand,
  Pacifico,
  Dancing_Script,
  JetBrains_Mono,
  Space_Mono,
  IBM_Plex_Mono,
} from "next/font/google";
import { Providers } from "@/components/providers";
import { OnboardingModal } from "@/components/onboarding-modal";
import { HelpCenter } from "@/components/ai/help-center";
import { auth } from "@/auth";
import { db } from "@/db";
import { regionalBranches } from "@/db/schema";
import { asc } from "drizzle-orm";
import { getT } from "@/lib/i18n/server";
import { LocaleProvider } from "@/lib/i18n/client";
import "./globals.css";

// next/font/google downloads and self-hosts the font at build time - no runtime
// request to fonts.googleapis.com ever happens (important for reachability from
// mainland China, see docs/Tech Stack.md).
//
// Body + UI face: Plus Jakarta Sans. Commissioned for Jakarta's city branding -
// an Indonesian-rooted humanist sans that stays warm at reading sizes and holds
// up in the dense console tables. Replaces Inter (see docs/Typography.md).
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// Serif display face for headings - Nanjing as the Jiangnan literary capital.
// Self-hosted through next/font for the same China-reachability reason as Jakarta.
const spectral = Spectral({
  variable: "--font-spectral",
  subsets: ["latin"],
  weight: ["400", "600", "800"],
});

// Optional per-event description typography (src/lib/event-description-style.ts)
// - admins can match an event's card to its poster's mood, grouped into 6
// categories in the picker. Same self-hosting reasoning as above; weights
// kept to 2 per font (regular + a bold-ish step, or just the 1 available
// weight for single-weight display/script faces) since each is only ever
// downloaded by a visitor whose event actually uses it, but there's no
// reason to ship more than the picker needs. Suffixed "-g" (raw next/font
// var) because globals.css wraps each with CJK/generic fallbacks into the
// final --font-poppins etc. used by the font-* utilities - same two-step
// pattern as --font-jakarta -> --font-sans above.
// Bersih & Modern
const poppins = Poppins({ variable: "--font-poppins-g", subsets: ["latin"], weight: ["400", "700"] });
const inter = Inter({ variable: "--font-inter-g", subsets: ["latin"], weight: ["400", "700"] });
const manrope = Manrope({ variable: "--font-manrope-g", subsets: ["latin"], weight: ["400", "700"] });
// Serif & Elegan
const playfair = Playfair_Display({ variable: "--font-playfair-g", subsets: ["latin"], weight: ["400", "700"] });
const lora = Lora({ variable: "--font-lora-g", subsets: ["latin"], weight: ["400", "700"] });
const merriweather = Merriweather({ variable: "--font-merriweather-g", subsets: ["latin"], weight: ["400", "700"] });
// Tegas & Poster
const bebasNeue = Bebas_Neue({ variable: "--font-bebas-g", subsets: ["latin"], weight: ["400"] });
const anton = Anton({ variable: "--font-anton-g", subsets: ["latin"], weight: ["400"] });
const oswald = Oswald({ variable: "--font-oswald-g", subsets: ["latin"], weight: ["400", "700"] });
// Playful & Santai
const fredoka = Fredoka({ variable: "--font-fredoka-g", subsets: ["latin"], weight: ["400", "600"] });
const baloo = Baloo_2({ variable: "--font-baloo-g", subsets: ["latin"], weight: ["400", "700"] });
const quicksand = Quicksand({ variable: "--font-quicksand-g", subsets: ["latin"], weight: ["400", "700"] });
// Tulisan Tangan
const caveat = Caveat({ variable: "--font-caveat-g", subsets: ["latin"], weight: ["400", "700"] });
const pacifico = Pacifico({ variable: "--font-pacifico-g", subsets: ["latin"], weight: ["400"] });
const dancingScript = Dancing_Script({ variable: "--font-dancing-g", subsets: ["latin"], weight: ["400", "700"] });
// Monospace & Teknis
const jetbrainsMono = JetBrains_Mono({ variable: "--font-jetbrains-g", subsets: ["latin"], weight: ["400", "700"] });
const spaceMono = Space_Mono({ variable: "--font-spacemono-g", subsets: ["latin"], weight: ["400", "700"] });
const plexMono = IBM_Plex_Mono({ variable: "--font-plexmono-g", subsets: ["latin"], weight: ["400", "700"] });

// generateMetadata, not a static object, so the tab title follows the reader's
// language. Crawlers carry no locale cookie, so they always see the id default
// and indexing stays stable - there is no URL prefix to split it across.
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("meta.homeTitle"), description: t("meta.homeDesc") };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await auth();
  const { locale, dict } = await getT();
  // Kota cabang untuk dropdown "Asal Kota" di modal onboarding. Cuma di-query
  // kalau modal itu memang mungkin muncul (emailSubscribed belum diisi) — kalau
  // tidak, jangan bebani tiap render layout root dengan satu round-trip DB.
  const onboardingBranches =
    session?.user && session.user.emailSubscribed == null
      ? (
          await db
            .select({ cityName: regionalBranches.cityName })
            .from(regionalBranches)
            .orderBy(asc(regionalBranches.cityName))
        ).map((b) => b.cityName)
      : [];
  return (
    // suppressHydrationWarning ada karena skrip tema di bawah MEMANG mengubah
    // <html> sebelum React hydrate: server merender tanpa data-mode, skrip
    // menambahkannya, lalu React mengeluh atributnya tidak cocok. Itu bukan bug
    // yang bisa diperbaiki tanpa membuang skripnya - dan membuangnya berarti
    // palet bawaan sempat terlihat lalu berkedip ganti.
    //
    // Efeknya cuma satu tingkat: atribut & teks elemen INI saja. Ketidakcocokan
    // hydration di dalam pohonnya tetap dilaporkan seperti biasa, jadi ini tidak
    // membungkam error lain.
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${jakarta.variable} ${spectral.variable} ${poppins.variable} ${inter.variable} ${manrope.variable} ${playfair.variable} ${lora.variable} ${merriweather.variable} ${bebasNeue.variable} ${anton.variable} ${oswald.variable} ${fredoka.variable} ${baloo.variable} ${quicksand.variable} ${caveat.variable} ${pacifico.variable} ${dancingScript.variable} ${jetbrainsMono.variable} ${spaceMono.variable} ${plexMono.variable} scroll-smooth`}
    >
      <body className="antialiased">
        {/* Applies the saved city theme + colour mode before anything paints.
            Without it the default palette renders first and visibly flips. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var d=document.documentElement,t=localStorage.getItem('ppit-city-theme'),m=localStorage.getItem('ppit-color-mode');" +
              "if(t&&t!=='zijin')d.dataset.theme=t;" +
              "d.dataset.mode=(m==='dark'||m==='light')?m:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');" +
              "}catch(e){}",
          }}
        />
        <Providers session={session}>
          <LocaleProvider locale={locale} dict={dict}>
            {children}
            <HelpCenter authed={!!session?.user} />
            <OnboardingModal branchOptions={onboardingBranches} />
          </LocaleProvider>
        </Providers>
      </body>
    </html>
  );
}
