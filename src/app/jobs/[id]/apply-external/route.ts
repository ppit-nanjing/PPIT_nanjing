import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { jobPostings } from "@/db/schema";
import { isHttpsUrl } from "@/lib/job-application";
import { hasCompletedSensus } from "@/lib/sensus-gate";
import { UUID_RE } from "@/lib/uuid";

// Pintu keluar ke situs perusahaan untuk lowongan yang melamar di sana.
//
// Tujuan pengalihan SELALU dibaca dari database berdasarkan id lowongan, tidak
// pernah dari parameter request, supaya rute ini tidak bisa dipakai sebagai
// open redirect. Syarat masuknya sama dengan melamar lewat form PPIT (login +
// sensus lengkap): lowongan di sini untuk anggota, dan itu juga yang menjaga
// penghitung klik dari robot dan pengunjung anonim.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return new Response("Not found", { status: 404 });

  const path = `/jobs/${id}/apply-external`;
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?returnTo=${encodeURIComponent(path)}`);
  if (!(await hasCompletedSensus(session.user.id))) redirect(`/sensus?returnTo=${encodeURIComponent(path)}`);

  const [job] = await db
    .select({ status: jobPostings.status, applyUrl: jobPostings.applyUrl })
    .from(jobPostings)
    .where(eq(jobPostings.id, id));
  if (!job) return new Response("Not found", { status: 404 });
  // Ditutup, atau tidak (lagi) memakai tautan eksternal: kembali ke halaman lowongan.
  if (job.status !== "open" || !job.applyUrl || !isHttpsUrl(job.applyUrl)) redirect(`/jobs/${id}`);

  // Gagal menghitung tidak boleh menghalangi anggota yang mau melamar.
  try {
    await db
      .update(jobPostings)
      .set({ externalClicks: sql`${jobPostings.externalClicks} + 1` })
      .where(eq(jobPostings.id, id));
  } catch (err) {
    console.error("[jobs] failed to count external apply click:", err);
  }

  redirect(job.applyUrl);
}
