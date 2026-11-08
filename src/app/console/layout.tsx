import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Toaster } from "sonner";
import { auth } from "@/auth";
import { ConsoleSidebar } from "@/components/console/console-sidebar";

// Judul tab: "<halaman> · Console PPIT Nanjing". Tanpa ini semua tab konsol berjudul sama dengan beranda,
// sehingga pengurus yang membuka beberapa tab (atau memakai pembaca layar) tak bisa membedakannya.
export const metadata: Metadata = { title: { template: "%s · Console PPIT Nanjing", default: "Console PPIT Nanjing" } };

// Every /console/* page is gated here - the route being named /console instead of
// /admin only reduces casual URL-guessing, this session check is the real boundary
// for "may this person see the console at all". Each module page, Server Action,
// export and API handler still enforces its OWN check (see AGENTS.md) - so
// admitting a committee member here does not hand them any module they lack.
export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  // Kabinet admin (module scope) ATAU panitia di minimal satu acara ATAU
  // koordinator divisi (menu Formulir/Oprek) ATAU pengurus kabinet (boleh membuat
  // draf acara). Yang non-admin masuk untuk mengurus acaranya sendiri; sidebar-nya
  // cuma menampilkan "Kegiatan" (yang di dalamnya sudah disaring ke acara dia).
  // Semua flag ini sudah dihitung di sesi (satu query gabungan) - tidak ada query
  // tambahan di sini.
  if (!session.user.isAdmin && !session.user.isCoordinator && !session.user.isCommittee && !session.user.canCreateEvent) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Toast global untuk seluruh /console/* - dipicu SubmitButton/ConfirmButton
          setelah sebuah server action selesai (lihat komponen masing-masing). */}
      <Toaster position="top-center" richColors closeButton />
      {/* Pengguna keyboard / pembaca layar: lompati sidebar langsung ke isi halaman. */}
      <a
        href="#console-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-md focus:bg-primary-container focus:px-4 focus:py-2 focus:text-label-caps focus:uppercase focus:tracking-wide focus:text-on-primary"
      >
        Lewati ke konten
      </a>
      {/* print:hidden - halaman console dicetak (mis. panduan Help Center jadi
          PDF) seharusnya cuma menampilkan konten, bukan navigasi admin. */}
      <div className="print:hidden">
        <ConsoleSidebar
          userName={session.user.name ?? "Admin"}
          scope={session.user.adminScope}
          isCommittee={session.user.isCommittee}
          // Menu Formulir untuk pengelola Oprek acara: BPH Acara ATAU Kadiv.
          isBphCommittee={session.user.isBphCommittee || session.user.isEventKadiv}
          isCoordinator={session.user.isCoordinator}
          canCreateSurvey={session.user.canCreateSurvey}
          canCreateEvent={session.user.canCreateEvent}
        />
      </div>
      {/* Fluid, bukan max-width terpusat: begitu sidebar dilipat, konten ikut
          memakai ruangnya - bukan menyisakan kosong kiri-kanan. */}
      <main id="console-main" tabIndex={-1} className="flex-1 min-w-0 focus:outline-none">
        <div className="w-full px-4 sm:px-6 lg:px-10 py-6 lg:py-8 print:p-0">{children}</div>
      </main>
    </div>
  );
}
