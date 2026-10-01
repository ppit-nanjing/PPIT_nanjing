import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { jobPostings } from "@/db/schema";
import { isHttpsUrl, isJobExpired } from "@/lib/job-application";
import { hasCompletedSensus } from "@/lib/sensus-gate";
import { UUID_RE } from "@/lib/uuid";

// Pintu keluar ke situs perusahaan untuk lowongan yang melamar di sana.
//
// Tujuan pengalihan SELALU dibaca dari database berdasarkan id lowongan, tidak
// pernah dari parameter request, supaya rute ini tidak bisa dipakai sebagai
// open redirect. Syarat masuknya sama dengan melamar lewat form PPIT (login +
// sensus lengkap): lowongan di sini untuk anggota, dan itu juga yang menjaga
// penghitung klik dari robot dan pengunjung anonim.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return new Response("Not found", { status: 404 });

  // Browser memuat tautan yang diprediksi akan diklik secara spekulatif, lengkap
  // dengan cookie sesi. Itu bukan niat melamar, jadi tidak boleh menambah hitungan.
  const purpose = `${request.headers.get("sec-purpose") ?? ""} ${request.headers.get("purpose") ?? ""}`;
  if (/prefetch|prerender/i.test(purpose)) return new Response(null, { status: 204 });

  const path = `/jobs/${id}/apply-external`;
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?returnTo=${encodeURIComponent(path)}`);

  // Dua query ini tidak saling bergantung.
  const [sensusComplete, [job]] = await Promise.all([
    hasCompletedSensus(session.user.id),
    db
      .select({
        status: jobPostings.status,
        applyUrl: jobPostings.applyUrl,
        applicationDeadline: jobPostings.applicationDeadline,
      })
      .from(jobPostings)
      .where(eq(jobPostings.id, id)),
  ]);
  if (!sensusComplete) redirect(`/sensus?returnTo=${encodeURIComponent(path)}`);
  // Lowongan sudah tidak ada, ditutup, lewat batas lamaran, atau tidak (lagi)
  // memakai tautan eksternal: halaman lowongan sendiri yang menjelaskan
  // (termasuk 404 bergaya aplikasi).
  if (!job || job.status !== "open" || isJobExpired(job.applicationDeadline) || !job.applyUrl || !isHttpsUrl(job.applyUrl)) redirect(`/jobs/${id}`);

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
