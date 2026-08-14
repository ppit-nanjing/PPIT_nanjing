import type { Metadata } from "next";
import { Inter } from "next/font/google";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${inter.variable} scroll-smooth`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
