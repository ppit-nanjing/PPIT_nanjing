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
    <div className="min-h-screen bg-background flex">
      <ConsoleSidebar userName={session.user.name ?? "Admin"} />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
