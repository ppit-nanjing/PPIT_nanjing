import { Toaster } from "sonner";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";

export const metadata = {
  title: "Formulir Kustom",
  robots: { index: false, follow: false },
};

// Area pembuat formulir (anggota kabinet dan panitia acara). Di luar /console
// karena layout konsol hanya menerima admin/koordinator/panitia dan dashboardnya
// menampilkan data yang tidak untuk semua anggota kabinet. Setiap halaman di
// sini tetap memeriksa haknya sendiri (src/lib/survey-access.ts).
export default function FormulirLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-on-background">
      {/* Toast untuk SubmitButton/ConfirmButton/FormFieldEditor yang dipakai bersama konsol. */}
      <Toaster position="top-center" richColors closeButton />
      <SiteNav />
      <main className="max-w-5xl mx-auto px-[var(--spacing-container-padding)] py-10">{children}</main>
      <SiteFooter />
    </div>
  );
}
