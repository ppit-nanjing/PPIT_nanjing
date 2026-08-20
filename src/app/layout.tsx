import type { Metadata } from "next";
import { Inter, Spectral } from "next/font/google";
import { Providers } from "@/components/providers";
import { OnboardingModal } from "@/components/onboarding-modal";
import { HelpCenter } from "@/components/ai/help-center";
import { auth } from "@/auth";
import { getT } from "@/lib/i18n/server";
import { LocaleProvider } from "@/lib/i18n/client";
import "./globals.css";

// next/font/google downloads and self-hosts the font at build time - no runtime
// request to fonts.googleapis.com ever happens (important for reachability from
// mainland China, see docs/Tech Stack.md).
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "700", "800"],
});

// Serif display face for headings - Nanjing as the Jiangnan literary capital.
// Self-hosted through next/font for the same China-reachability reason as Inter.
const spectral = Spectral({
  variable: "--font-spectral",
  subsets: ["latin"],
  weight: ["400", "600", "800"],
});

export const metadata: Metadata = {
  title: "PPIT Nanjing - Wadah Sinergi dan Kontribusi",
  description:
    "Perhimpunan Pelajar Indonesia Tiongkok Cabang Nanjing - wadah resmi mahasiswa Indonesia di Nanjing untuk bersinergi, berkarya, dan berkontribusi.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await auth();
  const { locale, dict } = await getT();
  return (
    <html lang={locale} className={`${inter.variable} ${spectral.variable} scroll-smooth`}>
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
            <OnboardingModal />
          </LocaleProvider>
        </Providers>
      </body>
    </html>
  );
}
