import type { Metadata } from "next";
import {
  Cinzel,
  Josefin_Sans,
  Cormorant_Garamond,
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
  Kalam,
  Indie_Flower,
  Permanent_Marker,
  Great_Vibes,
  Shadows_Into_Light,
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
import { INTRO_GATE } from "@/lib/intro-gate";
import "./globals.css";

// next/font/google downloads and self-hosts the font at build time - no runtime
// request to fonts.googleapis.com ever happens (important for reachability from
// mainland China, see docs/Tech Stack.md).
//
// Art Deco + Art Nouveau type system (redesign 2026-10):
// - Cinzel: display face for headings, eyebrows/labels, buttons, statistic numerals.
// - Josefin Sans: body and UI text, including the dense console tables.
// - Cormorant Garamond (italic only): leadership quotes.
// All three are variable fonts, so no `weight` list: one clean query per font
// avoids the discrete-weight resolver failure documented at Manrope below.
const cinzel = Cinzel({ variable: "--font-cinzel", subsets: ["latin"], weight: "variable" });
const josefin = Josefin_Sans({ variable: "--font-josefin", subsets: ["latin"], weight: "variable" });
const cormorant = Cormorant_Garamond({ variable: "--font-cormorant", subsets: ["latin"], style: "italic", weight: "variable" });

// The former site faces (Plus Jakarta Sans body, Spectral headings). They are no
// longer the site typography; they stay loaded ONLY so the event-description font
// picker can still offer them (src/lib/event-description-style.ts).
// preload: false, so a visitor downloads them only when an event actually uses one.
// Plus Jakarta Sans is a variable font on Google Fonts, so it takes weight:
// "variable" like Manrope below; requesting discrete weights trips the Turbopack
// font resolver ("queries have exactly one entry") in a production build.
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: "variable",
  preload: false,
});
const spectral = Spectral({
  variable: "--font-spectral",
  subsets: ["latin"],
  weight: ["400", "600", "800"],
  preload: false,
});

// Optional per-event description typography (src/lib/event-description-style.ts)
// - admins can match an event's card to its poster's mood, grouped into 6
// categories in the picker. Same self-hosting reasoning as above; weights
// kept to 2 per font (regular + a bold-ish step, or just the 1 available
// weight for single-weight display/script faces). Every one has preload: false:
// next/font otherwise injects a <link rel="preload"> for each on EVERY page, which
// measured ~710 KB of fonts per page load for readers behind the Great Firewall
// who almost never see an event that uses one. With it off, the @font-face is still
// declared and the file downloads only when an element actually uses the font. Suffixed "-g" (raw next/font
// var) because globals.css wraps each with CJK/generic fallbacks into the
// final --font-poppins etc. used by the font-* utilities - same two-step
// pattern as --font-jakarta -> --font-sans above.
// Bersih & Modern
const poppins = Poppins({ variable: "--font-poppins-g", subsets: ["latin"], weight: ["400", "700"], preload: false });
const inter = Inter({ variable: "--font-inter-g", subsets: ["latin"], weight: ["400", "700"], preload: false });
// Manrope is variable-only on Google Fonts (no static per-weight files) -
// requesting discrete weight: ["400","700"] worked in local dev/build but
// broke Turbopack's font resolver on Vercel's build ("next/font/google
// queries have exactly one entry", 12 failures - one per unicode-range
// subset block Google splits it into). weight: "variable" requests the
// actual variable axis in one clean query instead of two colliding ones.
const manrope = Manrope({ variable: "--font-manrope-g", subsets: ["latin"], weight: "variable", preload: false });
// Serif & Elegan
const playfair = Playfair_Display({ variable: "--font-playfair-g", subsets: ["latin"], weight: ["400", "700"], preload: false });
const lora = Lora({ variable: "--font-lora-g", subsets: ["latin"], weight: ["400", "700"], preload: false });
const merriweather = Merriweather({ variable: "--font-merriweather-g", subsets: ["latin"], weight: ["400", "700"], preload: false });
// Tegas & Poster
const bebasNeue = Bebas_Neue({ variable: "--font-bebas-g", subsets: ["latin"], weight: ["400"], preload: false });
const anton = Anton({ variable: "--font-anton-g", subsets: ["latin"], weight: ["400"], preload: false });
const oswald = Oswald({ variable: "--font-oswald-g", subsets: ["latin"], weight: ["400", "700"], preload: false });
// Playful & Santai
const fredoka = Fredoka({ variable: "--font-fredoka-g", subsets: ["latin"], weight: ["400", "600"], preload: false });
const baloo = Baloo_2({ variable: "--font-baloo-g", subsets: ["latin"], weight: ["400", "700"], preload: false });
const quicksand = Quicksand({ variable: "--font-quicksand-g", subsets: ["latin"], weight: ["400", "700"], preload: false });
// Tulisan Tangan
const caveat = Caveat({ variable: "--font-caveat-g", subsets: ["latin"], weight: ["400", "700"], preload: false });
const pacifico = Pacifico({ variable: "--font-pacifico-g", subsets: ["latin"], weight: ["400"], preload: false });
const dancingScript = Dancing_Script({ variable: "--font-dancing-g", subsets: ["latin"], weight: ["400", "700"], preload: false });
const kalam = Kalam({ variable: "--font-kalam-g", subsets: ["latin"], weight: ["400", "700"], preload: false });
const indieFlower = Indie_Flower({ variable: "--font-indieflower-g", subsets: ["latin"], weight: ["400"], preload: false });
const permanentMarker = Permanent_Marker({ variable: "--font-permanentmarker-g", subsets: ["latin"], weight: ["400"], preload: false });
const greatVibes = Great_Vibes({ variable: "--font-greatvibes-g", subsets: ["latin"], weight: ["400"], preload: false });
const shadowsIntoLight = Shadows_Into_Light({ variable: "--font-shadows-g", subsets: ["latin"], weight: ["400"], preload: false });
// Monospace & Teknis
const jetbrainsMono = JetBrains_Mono({ variable: "--font-jetbrains-g", subsets: ["latin"], weight: ["400", "700"], preload: false });
const spaceMono = Space_Mono({ variable: "--font-spacemono-g", subsets: ["latin"], weight: ["400", "700"], preload: false });
const plexMono = IBM_Plex_Mono({ variable: "--font-plexmono-g", subsets: ["latin"], weight: ["400", "700"], preload: false });

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
      className={`${cinzel.variable} ${josefin.variable} ${cormorant.variable} ${jakarta.variable} ${spectral.variable} ${poppins.variable} ${inter.variable} ${manrope.variable} ${playfair.variable} ${lora.variable} ${merriweather.variable} ${bebasNeue.variable} ${anton.variable} ${oswald.variable} ${fredoka.variable} ${baloo.variable} ${quicksand.variable} ${caveat.variable} ${pacifico.variable} ${dancingScript.variable} ${kalam.variable} ${indieFlower.variable} ${permanentMarker.variable} ${greatVibes.variable} ${shadowsIntoLight.variable} ${jetbrainsMono.variable} ${spaceMono.variable} ${plexMono.variable} scroll-smooth`}
    >
      <body className="antialiased">
        {/* Applies the saved city theme + colour mode before anything paints.
            Without it the default palette renders first and visibly flips. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var d=document.documentElement,t=localStorage.getItem('ppit-city-theme'),m=localStorage.getItem('ppit-color-mode');" +
              "if(t&&t!=='zijin')d.dataset.theme=t;" +
              // Light is the default. The OS setting is followed only when the visitor
              // explicitly chose "Match system" (stored as 'system').
              "d.dataset.mode=m==='dark'?'dark':(m==='system'&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';" +
              "}catch(e){}" +
              // Home-page intro gate (see lib/intro-gate.ts): adds "no-intro" to <html>
              // when the curtain should not play on this page load.
              INTRO_GATE,
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
