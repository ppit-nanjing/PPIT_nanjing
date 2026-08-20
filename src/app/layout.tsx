import type { Metadata } from "next";
import { Inter, Spectral } from "next/font/google";
import { Providers } from "@/components/providers";
import { OnboardingModal } from "@/components/onboarding-modal";
import { HelpCenter } from "@/components/ai/help-center";
import { auth } from "@/auth";
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
  return (
    <html lang="id" className={`${inter.variable} ${spectral.variable} scroll-smooth`}>
      <head>
        {/* Applies the saved city theme before first paint. Without this the
            default palette renders first and visibly flips on hydration. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('ppit-city-theme');if(t&&t!=='zijin')document.documentElement.dataset.theme=t;}catch(e){}",
          }}
        />
      </head>
      <body className="antialiased">
        <Providers session={session}>
          {children}
          <HelpCenter authed={!!session?.user} />
          <OnboardingModal />
        </Providers>
      </body>
    </html>
  );
}
