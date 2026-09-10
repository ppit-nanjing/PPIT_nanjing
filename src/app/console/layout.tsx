import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Toaster } from "sonner";
import { auth } from "@/auth";
import { db } from "@/db";
import { eventCommittee } from "@/db/schema";
import { ConsoleSidebar } from "@/components/console/console-sidebar";

// Every /console/* page is gated here - the route being named /console instead of
// /admin only reduces casual URL-guessing, this session check is the real boundary
// for "may this person see the console at all". Each module page, Server Action,
// export and API handler still enforces its OWN check (see AGENTS.md) - so
// admitting a committee member here does not hand them any module they lack.
export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  // Kabinet admin (module scope) ATAU panitia di minimal satu acara. Panitia
  // non-admin masuk untuk mengurus acaranya sendiri; sidebar-nya cuma
  // menampilkan "Kegiatan" (yang di dalamnya sudah disaring ke acara dia).
  let onCommittee = false;
  if (!session.user.isAdmin) {
    const [row] = await db
      .select({ id: eventCommittee.id })
      .from(eventCommittee)
      .where(eq(eventCommittee.userId, session.user.id))
      .limit(1);
    onCommittee = !!row;
    if (!onCommittee) redirect("/");
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Toast global untuk seluruh /console/* - dipicu SubmitButton/ConfirmButton
          setelah sebuah server action selesai (lihat komponen masing-masing). */}
      <Toaster position="top-center" richColors closeButton />
      <ConsoleSidebar
        userName={session.user.name ?? "Admin"}
        scope={session.user.adminScope}
        isCommittee={onCommittee}
      />
      {/* Fluid, bukan max-width terpusat: begitu sidebar dilipat, konten ikut
          memakai ruangnya - bukan menyisakan kosong kiri-kanan. */}
      <main className="flex-1 min-w-0">
        <div className="w-full px-4 sm:px-6 lg:px-10 py-6 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
