import { and, eq } from "drizzle-orm";
import { CheckCircle2, ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { events, forms } from "@/db/schema";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { hasCompletedSensus } from "@/lib/sensus-gate";
import { UUID_RE } from "@/lib/uuid";

export const metadata = {
  title: "Jawaban terkirim",
  robots: { index: false, follow: false },
};

// Halaman setelah mengirim formulir. Pengisi publik tidak punya sesi, jadi halaman
// ini tidak membuktikan siapa pun sudah mengirim: isinya hanya judul dan pesan
// penutup yang memang untuk dibaca pengisi. Formulir khusus akun tetap meminta login.
export default async function SurveySubmittedPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sensus?: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const { sensus } = await searchParams;

  const [form] = await db.select().from(forms).where(and(eq(forms.id, id), eq(forms.kind, "survei")));
  if (!form) notFound();
  if (form.eventId) {
    const [ev] = await db.select({ deletedAt: events.deletedAt }).from(events).where(eq(events.id, form.eventId));
    if (!ev || ev.deletedAt) notFound();
  }

  const session = await auth();
  const userId = session?.user?.id || null;
  if (!form.allowPublic && !userId) redirect(`/login?returnTo=${encodeURIComponent(`/f/${form.id}`)}`);

  // Ajakan sensus: submitSurvey menambahkan ?sensus=1 untuk pengisi yang mengisi biodata sendiri
  // dengan kota Nanjing. Bendera ini hanya menampilkan tautan (tidak membuka apa pun), dan yang
  // ternyata sudah sensus lengkap tidak diajak lagi.
  const inviteSensus = sensus === "1" && !(userId && (await hasCompletedSensus(userId)));
  const sensusPath = "/sensus";

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

        {inviteSensus && (
          <section
            aria-labelledby="ajakan-sensus"
            className="deco-frame mt-6 rounded-xl bg-surface-container-low px-6 py-8 text-center"
          >
            <ClipboardCheck className="text-primary-container mx-auto mb-3" size={30} aria-hidden />
            <h2 id="ajakan-sensus" className="text-headline-md text-on-background mb-2">
              Satu langkah lagi: isi sensus PPIT Nanjing
            </h2>
            <p className="text-body-md text-on-surface-variant mb-5">
              Kamu mengisi kota Nanjing, tapi belum tercatat di sensus. Sensus membantu pengurus mengenal mahasiswa
              Indonesia di Nanjing, dan dibutuhkan untuk mendaftar acara tertentu, meminjam inventaris, dan melamar
              lowongan lewat website. Cukup beberapa menit.
            </p>
            {userId ? (
              <Link
                href={`${sensusPath}?returnTo=${encodeURIComponent(`/f/${form.id}/terkirim`)}`}
                className="deco-btn inline-block bg-accent text-on-accent text-label-caps uppercase px-6 py-3 rounded-md hover:brightness-95 transition-[filter]"
              >
                Isi sensus sekarang
              </Link>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <p className="text-body-sm text-on-surface-variant">
                  Sensus diisi lewat akun. Buat akun atau masuk dulu, lalu kamu langsung diarahkan ke sensus.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Link
                    href={`/signup?returnTo=${encodeURIComponent(sensusPath)}`}
                    className="deco-btn inline-block bg-accent text-on-accent text-label-caps uppercase px-6 py-3 rounded-md hover:brightness-95 transition-[filter]"
                  >
                    Buat akun
                  </Link>
                  <Link
                    href={`/login?returnTo=${encodeURIComponent(sensusPath)}`}
                    className="inline-block border border-outline-variant text-on-background text-label-caps uppercase px-6 py-3 rounded-md hover:bg-surface-container transition-colors"
                  >
                    Masuk
                  </Link>
                </div>
              </div>
            )}
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
