import type { Metadata } from "next";
import localFont from "next/font/local";
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

// Font files are vendored in ./fonts and loaded with next/font/local, so no
// build step calls fonts.googleapis.com any more. next/font/google fetched the
// CSS and the woff2 files during `next build`, and Google intermittently answers
// with extensionless /l/font?kit=... URLs that Turbopack's font resolver rejects
// ("next/font/google queries have exactly one entry", vercel/next.js#99114) -
// with 28 families that flaked roughly every other deployment. Self-hosting also
// keeps Chinese readers off Google's CDN (docs/Tech Stack.md).
//
// Art Deco + Art Nouveau type system (redesign 2026-10):
// - Cinzel: display face for headings, eyebrows/labels, buttons, statistic numerals.
// - Josefin Sans: body and UI text, including the dense console tables.
// - Cormorant Garamond (italic only): leadership quotes.
// All three are variable fonts; the weight range covers every weight the site uses.
const cinzel = localFont({ src: "./fonts/cinzel.woff2", variable: "--font-cinzel", weight: "400 900" });
const josefin = localFont({ src: "./fonts/josefin-sans.woff2", variable: "--font-josefin", weight: "100 700" });
const cormorant = localFont({
  src: [{ path: "./fonts/cormorant-garamond-italic.woff2", weight: "300 700", style: "italic" }],
  variable: "--font-cormorant",
});

// The former site faces (Plus Jakarta Sans body, Spectral headings). They are no
// longer the site typography; they stay loaded ONLY so the event-description font
// picker can still offer them (src/lib/event-description-style.ts).
// preload: false, so a visitor downloads them only when an event actually uses one.
// (The weight ranges below come from the vendored files, not from Google.)
const jakarta = localFont({
  src: "./fonts/plus-jakarta-sans.woff2",
  variable: "--font-jakarta",
  weight: "200 800",
  preload: false,
});
const spectral = localFont({
  src: [
    { path: "./fonts/spectral-400.woff2", weight: "400" },
    { path: "./fonts/spectral-600.woff2", weight: "600" },
    { path: "./fonts/spectral-800.woff2", weight: "800" },
  ],
  variable: "--font-spectral",
  preload: false,
});

// Optional per-event description typography (src/lib/event-description-style.ts)
// - admins can match an event's card to its poster's mood, grouped into 6
// categories in the picker. Every one has preload: false: next/font otherwise
// injects a <link rel="preload"> for each on EVERY page, which measured ~710 KB
// of fonts per page load for readers behind the Great Firewall who almost never
// see an event that uses one. With it off, the @font-face is still declared and
// the file downloads only when an element actually uses the font. Suffixed "-g"
// (raw next/font var) because globals.css wraps each with CJK/generic fallbacks
// into the final --font-poppins etc. used by the font-* utilities - same
// two-step pattern as --font-jakarta -> --font-sans above.
// Bersih & Modern
const poppins = localFont({
  src: [
    { path: "./fonts/poppins-400.woff2", weight: "400" },
    { path: "./fonts/poppins-700.woff2", weight: "700" },
  ],
  variable: "--font-poppins-g",
  preload: false,
});
const inter = localFont({ src: "./fonts/inter.woff2", variable: "--font-inter-g", weight: "100 900", preload: false });
const manrope = localFont({ src: "./fonts/manrope.woff2", variable: "--font-manrope-g", weight: "200 800", preload: false });
// Serif & Elegan
const playfair = localFont({ src: "./fonts/playfair-display.woff2", variable: "--font-playfair-g", weight: "400 900", preload: false });
const lora = localFont({ src: "./fonts/lora.woff2", variable: "--font-lora-g", weight: "400 700", preload: false });
const merriweather = localFont({ src: "./fonts/merriweather.woff2", variable: "--font-merriweather-g", weight: "300 900", preload: false });
// Tegas & Poster
const bebasNeue = localFont({ src: "./fonts/bebas-neue.woff2", variable: "--font-bebas-g", weight: "400", preload: false });
const anton = localFont({ src: "./fonts/anton.woff2", variable: "--font-anton-g", weight: "400", preload: false });
const oswald = localFont({ src: "./fonts/oswald.woff2", variable: "--font-oswald-g", weight: "200 700", preload: false });
// Playful & Santai
const fredoka = localFont({ src: "./fonts/fredoka.woff2", variable: "--font-fredoka-g", weight: "300 700", preload: false });
const baloo = localFont({ src: "./fonts/baloo-2.woff2", variable: "--font-baloo-g", weight: "400 800", preload: false });
const quicksand = localFont({ src: "./fonts/quicksand.woff2", variable: "--font-quicksand-g", weight: "300 700", preload: false });
// Tulisan Tangan
const caveat = localFont({ src: "./fonts/caveat.woff2", variable: "--font-caveat-g", weight: "400 700", preload: false });
const pacifico = localFont({ src: "./fonts/pacifico.woff2", variable: "--font-pacifico-g", weight: "400", preload: false });
const dancingScript = localFont({ src: "./fonts/dancing-script.woff2", variable: "--font-dancing-g", weight: "400 700", preload: false });
const kalam = localFont({
  src: [
    { path: "./fonts/kalam-400.woff2", weight: "400" },
    { path: "./fonts/kalam-700.woff2", weight: "700" },
  ],
  variable: "--font-kalam-g",
  preload: false,
});
const indieFlower = localFont({ src: "./fonts/indie-flower.woff2", variable: "--font-indieflower-g", weight: "400", preload: false });
const permanentMarker = localFont({ src: "./fonts/permanent-marker.woff2", variable: "--font-permanentmarker-g", weight: "400", preload: false });
const greatVibes = localFont({ src: "./fonts/great-vibes.woff2", variable: "--font-greatvibes-g", weight: "400", preload: false });
const shadowsIntoLight = localFont({ src: "./fonts/shadows-into-light.woff2", variable: "--font-shadows-g", weight: "400", preload: false });
// Monospace & Teknis
const jetbrainsMono = localFont({ src: "./fonts/jetbrains-mono.woff2", variable: "--font-jetbrains-g", weight: "100 800", preload: false });
const spaceMono = localFont({
  src: [
    { path: "./fonts/space-mono-400.woff2", weight: "400" },
    { path: "./fonts/space-mono-700.woff2", weight: "700" },
  ],
  variable: "--font-spacemono-g",
  preload: false,
});
const plexMono = localFont({
  src: [
    { path: "./fonts/ibm-plex-mono-400.woff2", weight: "400" },
    { path: "./fonts/ibm-plex-mono-700.woff2", weight: "700" },
  ],
  variable: "--font-plexmono-g",
  preload: false,
});

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
      // `scroll-smooth` below needs this: Next 16 stopped overriding scroll-behavior
      // during route transitions, so without the attribute a page change would
      // animate the scroll instead of jumping to the top. It also silences the dev
      // warning (missing-data-scroll-behavior) the right way.
      data-scroll-behavior="smooth"
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
