import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { CheckCircle2 } from "lucide-react";

export default function JoinUsSuccessPage() {
  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />
      <main className="max-w-md mx-auto px-[var(--spacing-container-padding)] py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-primary-container/10 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="text-primary-container" size={28} />
        </div>
        <h1 className="text-headline-lg text-on-background mb-2">Pendaftaran Terkirim</h1>
        <p className="text-body-md text-on-surface-variant mb-10">
          Terima kasih sudah mendaftar sebagai calon pengurus PPIT Nanjing. Proses wawancara akan
          dikabarkan lewat grup rekrutmen.
        </p>
        <a
          href="/"
          className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
        >
          Kembali ke Beranda
        </a>
      </main>
      <SiteFooter />
    </div>
  );
}
