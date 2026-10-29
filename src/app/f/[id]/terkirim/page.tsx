import { and, eq } from "drizzle-orm";
import { CheckCircle2 } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { events, forms } from "@/db/schema";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { UUID_RE } from "@/lib/uuid";

export const metadata = {
  title: "Jawaban terkirim",
  robots: { index: false, follow: false },
};

// Halaman setelah mengirim formulir. Pengisi publik tidak punya sesi, jadi halaman
// ini tidak membuktikan siapa pun sudah mengirim: isinya hanya judul dan pesan
// penutup yang memang untuk dibaca pengisi. Formulir khusus akun tetap meminta login.
export default async function SurveySubmittedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const [form] = await db.select().from(forms).where(and(eq(forms.id, id), eq(forms.kind, "survei")));
  if (!form) notFound();
  if (form.eventId) {
    const [ev] = await db.select({ deletedAt: events.deletedAt }).from(events).where(eq(events.id, form.eventId));
    if (!ev || ev.deletedAt) notFound();
  }

  if (!form.allowPublic) {
    const session = await auth();
    if (!session?.user?.id) redirect(`/login?returnTo=${encodeURIComponent(`/f/${form.id}`)}`);
  }

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />
      <main className="max-w-2xl mx-auto px-[var(--spacing-container-padding)] py-16">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl px-6 py-14 text-center">
          <CheckCircle2 className="text-primary-container mx-auto mb-4" size={40} aria-hidden />
          <p className="text-label-caps uppercase tracking-wide text-gold-ink mb-2">Formulir</p>
          <h1 className="text-headline-lg text-on-background mb-3">Jawaban terkirim</h1>
          <p className="text-body-lg text-on-surface-variant whitespace-pre-wrap">{form.confirmationMessage}</p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
