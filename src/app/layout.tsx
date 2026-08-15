import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import { FeedbackWidget } from "@/components/feedback/feedback-widget";
import { OnboardingModal } from "@/components/onboarding-modal";
import { ScrollFadeOverlay } from "@/components/scroll-fade-overlay";
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

export const metadata: Metadata = {
  title: "PPIT Nanjing - Wadah Sinergi dan Kontribusi",
  description:
    "Perhimpunan Pelajar Indonesia Tiongkok Cabang Nanjing - wadah resmi mahasiswa Indonesia di Nanjing untuk bersinergi, berkarya, dan berkontribusi.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await auth();
  return (
    <html lang="id" className={`${inter.variable} scroll-smooth`}>
      <body className="antialiased">
        <Providers session={session}>
          {children}
          <ScrollFadeOverlay />
          <FeedbackWidget />
          <OnboardingModal />
        </Providers>
      </body>
    </html>
  );
}
