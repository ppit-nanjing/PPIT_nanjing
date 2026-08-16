import { Home, Compass } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-[var(--spacing-container-padding)]">
      <div className="w-full max-w-lg bg-surface-container-lowest rounded-xl p-10 text-center">
        <p className="text-display-hero-mobile text-primary-container mb-4">404</p>
        <h1 className="text-headline-lg text-on-background mb-4">Halaman tidak ditemukan</h1>
        <p className="text-body-md text-on-surface-variant mb-8">
          Halaman yang Anda cari mungkin sudah dipindahkan, dihapus, atau memang tidak pernah ada.
          Coba kembali ke beranda atau jelajahi kegiatan PPIT Nanjing lainnya.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
          >
            <Home size={18} /> Kembali ke Beranda
          </Link>
          <Link
            href="/events"
            className="inline-flex items-center justify-center gap-2 border border-outline-variant text-on-background text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-surface-container-low transition-colors"
          >
            <Compass size={18} /> Jelajahi Kegiatan
          </Link>
        </div>
      </div>
    </div>
  );
}
