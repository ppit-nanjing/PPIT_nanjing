import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ConsoleSidebar } from "@/components/console/console-sidebar";

// Every /console/* page is gated here - the route being named /console instead of
// /admin only reduces casual URL-guessing, this session check is the real boundary.
export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");
  if (!session.user.isAdmin) redirect("/");

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <ConsoleSidebar userName={session.user.name ?? "Admin"} scope={session.user.adminScope} />
      {/* Fluid, bukan max-width terpusat: begitu sidebar dilipat, konten ikut
          memakai ruangnya - bukan menyisakan kosong kiri-kanan. */}
      <main className="flex-1 min-w-0">
        <div className="w-full px-4 sm:px-6 lg:px-10 py-6 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
