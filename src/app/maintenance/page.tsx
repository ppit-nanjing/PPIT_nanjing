import { Wrench } from "lucide-react";

export default function MaintenancePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-[var(--spacing-container-padding)]">
      <div className="text-center max-w-lg">
        <div className="w-16 h-16 rounded-full bg-surface-container-low border border-outline-variant flex items-center justify-center mx-auto mb-8">
          <Wrench className="text-primary-container" size={28} aria-hidden />
        </div>
        <h1 className="text-headline-lg text-on-background mb-4">Sedang Dalam Perbaikan</h1>
        <p className="text-body-md text-on-surface-variant mb-2">
          PPIT Nanjing sedang melakukan pemeliharaan sistem untuk meningkatkan layanan. Mohon
          maaf atas ketidaknyamanannya &mdash; kami akan segera kembali.
        </p>
        <p className="text-label-caps text-secondary uppercase mt-8">
          Butuh bantuan segera? Hubungi pengurus lewat Instagram{" "}
          <a
            href="https://instagram.com/ppit_nanjing"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-primary rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            @ppit_nanjing
          </a>
        </p>
      </div>
    </div>
  );
}
