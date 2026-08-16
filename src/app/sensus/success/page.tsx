import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function SensusSuccessPage() {
  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />
      <main className="max-w-md mx-auto px-[var(--spacing-container-padding)] py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-primary-container/10 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="text-primary-container" size={28} />
        </div>
        <h1
          tabIndex={-1}
          autoFocus
          className="text-headline-lg text-on-background mb-2 outline-none focus-visible:ring-2 focus-visible:ring-primary-container rounded-sm"
        >
          Sensus Tersimpan
        </h1>
        <div role="status" className="text-body-md text-on-surface-variant mb-10">
          Terima kasih sudah mengisi data sensus. Kamu bisa memperbaruinya kapan saja.
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/sensus"
            className="border border-outline-variant text-on-background text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-surface-container-low transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Lihat/Ubah Data
          </Link>
          <Link
            href="/"
            className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
