"use server";

import { and, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { auditLogs, jobApplications, jobPostings } from "@/db/schema";
import { requireModuleAccess } from "@/lib/admin-scope";
import { requireCompletedSensus } from "@/lib/sensus-gate";
import { createTemplatedNotification } from "@/lib/notifications";
import { withFlash } from "@/lib/flash";
import { UUID_RE } from "@/lib/uuid";
import {
  isHttpsUrl,
  isHttpUrl,
  isJobApplicationStatus,
  isJobType,
  JOB_APPLICATION_STATUS_LABEL,
} from "@/lib/job-application";

export async function applyToJob(jobId: string, formData: FormData) {
  const session = await requireCompletedSensus(`/jobs/${jobId}/apply`);

  const resumeUrl = String(formData.get("resumeUrl") ?? "").trim();
  const coverLetter = String(formData.get("coverLetter") ?? "").trim();
  if (!resumeUrl) throw new Error("Tautan resume/CV wajib diisi");
  // Tautan ini kini dirender sebagai link klik di console pengurus, jadi hanya
  // http(s) yang diterima (unggahan Blob dan tautan Drive lolos).
  if (!isHttpUrl(resumeUrl)) throw new Error("Tautan resume/CV harus berupa alamat http(s) yang valid");

  const [existing] = await db
    .select()
    .from(jobApplications)
    .where(and(eq(jobApplications.jobId, jobId), eq(jobApplications.userId, session.user.id)));

  if (existing) redirect(`/jobs/${jobId}/applied`);

  const [job] = await db
    .select({ title: jobPostings.title, status: jobPostings.status, applyUrl: jobPostings.applyUrl })
    .from(jobPostings)
    .where(eq(jobPostings.id, jobId));
  // Menutup lowongan di console harus benar-benar menghentikan lamaran baru,
  // bukan hanya menyembunyikan tombolnya. Lowongan yang melamar lewat situs
  // perusahaan juga tidak boleh menampung lamaran lewat form PPIT.
  if (!job || job.status !== "open" || job.applyUrl) redirect(`/jobs/${jobId}`);

  await db.insert(jobApplications).values({
    jobId,
    userId: session.user.id,
    resumeUrl,
    coverLetter: coverLetter || null,
  });

  // In-app confirmation for the member who just applied.
  await createTemplatedNotification({
    userId: session.user.id,
    templateKey: "job_application",
    variables: { jobTitle: job?.title ?? "lowongan" },
    relatedEntityType: "job",
    relatedEntityId: jobId,
  });

  redirect(`/jobs/${jobId}/applied`);
}

// ---------- Console (modul "career") ----------

// Isian form lowongan sebagaimana dikirim, dikembalikan bersama error validasi.
export type JobFormValues = {
  title: string;
  company: string;
  location: string;
  type: string;
  applicationDeadline: string;
  description: string;
  requirements: string;
  applyMode: string;
  applyUrl: string;
  open: boolean;
};

// nonce berganti di setiap error; form memakainya sebagai key supaya dibuat
// ulang dengan isian yang dikembalikan (lihat JobPostingForm).
export type JobFormState = { error?: string; values?: JobFormValues; nonce?: string };

// Bentuk YYYY-MM-DD saja tidak cukup ("2026-13-45" lolos); round-trip lewat Date
// memastikan tanggalnya ada, karena Postgres akan melempar error untuk yang tidak valid.
function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

// id dari FormData masuk ke kolom uuid; nilai sembarang akan membuat Postgres
// melempar error (500) alih-alih penolakan yang rapi.
function readId(formData: FormData): string {
  const id = String(formData.get("id") ?? "");
  if (!UUID_RE.test(id)) throw new Error("Permintaan tidak valid.");
  return id;
}

// Semua halaman publik yang memuat lowongan. /sitemap.xml di-prerender statis
// dan memuat lowongan open, jadi ikut di-revalidate.
function revalidatePublicJobs(jobId: string) {
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/career");
  revalidatePath("/sitemap.xml");
}

// Semua nama host yang menyajikan situs ini: host request ini, alias produksi,
// dan URL deployment. Dibaca dari request/environment, bukan dikonfigurasi,
// supaya tetap benar setelah domain pindah.
async function ownHosts(): Promise<Set<string>> {
  const hosts = new Set<string>();
  const requestHost = (await headers()).get("host");
  if (requestHost) hosts.add(requestHost.toLowerCase());
  for (const h of [process.env.VERCEL_PROJECT_PRODUCTION_URL, process.env.VERCEL_URL]) {
    if (h) hosts.add(h.toLowerCase());
  }
  return hosts;
}

// Inline error, bukan throw: error yang dilempar membuang pengurus ke error
// boundary dan formulir yang sudah panjang hilang.
export async function upsertJobPosting(
  existingId: string | null,
  _prev: JobFormState,
  formData: FormData,
): Promise<JobFormState> {
  const session = await requireModuleAccess("career");

  const title = String(formData.get("title") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const requirements = String(formData.get("requirements") ?? "").trim();
  const deadline = String(formData.get("applicationDeadline") ?? "").trim();
  const applyMode = String(formData.get("applyMode") ?? "internal") === "external" ? "external" : "internal";
  const applyUrlRaw = String(formData.get("applyUrl") ?? "").trim();

  // React 19 mereset kolom form begitu aksi selesai, termasuk saat aksi
  // mengembalikan error. Isian yang dikirim ikut dikembalikan (dan form dibuat
  // ulang dengan nonce baru) supaya setiap kolom, termasuk <select> yang tidak
  // mengikuti perubahan defaultValue, kembali ke yang tadi diketik. Tanpa ini
  // satu salah ketik di tautan mengosongkan seluruh form, dan percobaan
  // berikutnya bisa terkirim tanpa pilihan "Cara melamar" sehingga tautan
  // diam-diam hilang.
  const submitted: JobFormValues = {
    title,
    company,
    location,
    type,
    applicationDeadline: deadline,
    description,
    requirements,
    applyMode,
    applyUrl: applyUrlRaw,
    open: formData.get("open") === "on",
  };
  const fail = (error: string): JobFormState => ({ error, values: submitted, nonce: crypto.randomUUID() });

  if (existingId && !UUID_RE.test(existingId)) return fail("Lowongan tidak ditemukan.");
  if (!title) return fail("Judul lowongan wajib diisi.");
  if (!company) return fail("Nama perusahaan wajib diisi.");
  if (!isJobType(type)) return fail("Pilih jenis pekerjaan.");
  if (deadline && !isValidIsoDate(deadline)) return fail("Batas lamaran bukan tanggal yang valid.");

  // "Cara melamar": form PPIT (applyUrl null) atau situs perusahaan. Tautannya
  // nanti dipakai server untuk mengalihkan anggota ke luar, jadi dicek ketat di sini.
  let applyUrl: string | null = null;
  // Isian tautan hanya dirender (dan dikirim) saat "Lewat situs perusahaan"
  // dipilih. Tautan terisi dengan mode lain berarti pilihannya tidak ikut
  // terkirim; menyimpannya sebagai form PPIT berarti membuang tautan tanpa
  // pesan, jadi ditolak dengan jelas.
  if (applyMode !== "external" && applyUrlRaw) {
    return fail('Tautan terisi, tetapi "Cara melamar" bukan "Lewat situs perusahaan". Pilih opsi itu atau kosongkan tautannya.');
  }
  if (applyMode === "external") {
    if (!isHttpsUrl(applyUrlRaw)) return fail("Tautan lamaran harus berupa alamat https yang valid.");
    const url = new URL(applyUrlRaw);
    // Tautan ke PPIT sendiri akan membuat pengalihan berputar.
    if ((await ownHosts()).has(url.host.toLowerCase())) {
      return fail("Tautan harus mengarah ke situs perusahaan, bukan ke situs PPIT.");
    }
    // Simpan bentuk ternormalisasi: itulah yang sebenarnya sudah divalidasi.
    // String mentah bisa memuat karakter yang dibuang/di-encode oleh parser URL
    // (mis. tab atau baris baru) dan akan merusak header Location saat dipakai.
    applyUrl = url.href;
  }

  const values = {
    title,
    company,
    location: location || null,
    type,
    description: description || null,
    requirements: requirements || null,
    applicationDeadline: deadline || null,
    applyUrl,
  };

  let jobId: string;
  let previousApplyUrl: string | null = null;
  if (existingId) {
    const [before] = await db
      .select({ applyUrl: jobPostings.applyUrl })
      .from(jobPostings)
      .where(eq(jobPostings.id, existingId));
    previousApplyUrl = before?.applyUrl ?? null;
    const [updated] = await db
      .update(jobPostings)
      .set(values)
      .where(eq(jobPostings.id, existingId))
      .returning({ id: jobPostings.id });
    if (!updated) return fail("Lowongan tidak ditemukan (mungkin sudah dihapus).");
    jobId = updated.id;
  } else {
    // Lowongan baru langsung dibuka kecuali kotaknya sengaja dikosongkan.
    // Enumnya hanya open/closed, jadi "closed" berarti tidak tampil di daftar,
    // BUKAN rahasia: halaman /jobs/:id tetap bisa dibaca siapa pun yang punya tautannya.
    const [created] = await db
      .insert(jobPostings)
      .values({
        ...values,
        postedBy: session.user.id,
        status: submitted.open ? "open" : "closed",
      })
      .returning({ id: jobPostings.id });
    jobId = created.id;
  }

  // Tujuan lamaran menentukan ke mana anggota dikirim dari tombol berlogo PPIT,
  // jadi setiap perubahannya dicatat (siapa, dari apa ke apa).
  if (applyUrl !== previousApplyUrl) {
    await db.insert(auditLogs).values({
      actorUserId: session.user.id,
      entityType: "job_posting",
      entityId: jobId,
      action: "apply_url_changed",
      beforeJson: { applyUrl: previousApplyUrl },
      afterJson: { applyUrl },
    });
  }

  revalidatePath("/console/jobs");
  revalidatePublicJobs(jobId);
  redirect(withFlash("/console/jobs", "Lowongan tersimpan."));
}

// Buka/tutup tanpa menyentuh isi lowongan. Dipakai dari ConfirmButton di
// server component, jadi menerima FormData.
export async function setJobPostingStatus(formData: FormData) {
  await requireModuleAccess("career");
  const id = readId(formData);
  const status = String(formData.get("status") ?? "");
  if (status !== "open" && status !== "closed") throw new Error("Permintaan tidak valid.");

  const [updated] = await db
    .update(jobPostings)
    .set({ status })
    .where(eq(jobPostings.id, id))
    .returning({ id: jobPostings.id });
  if (!updated) throw new Error("Lowongan tidak ditemukan.");

  revalidatePath("/console/jobs");
  revalidatePath(`/console/jobs/${id}`);
  revalidatePublicJobs(id);
}

// Hapus permanen, termasuk semua lamarannya (FK cascade). Untuk lowongan salah
// input atau spam; untuk lowongan yang sekadar sudah selesai, pakai Tutup.
export async function deleteJobPosting(formData: FormData) {
  const session = await requireModuleAccess("career");
  const id = readId(formData);

  const [posting] = await db
    .select({ title: jobPostings.title, company: jobPostings.company })
    .from(jobPostings)
    .where(eq(jobPostings.id, id));
  // Sudah hilang (klik ganda, tab lama): tujuannya tercapai, kembali ke daftar.
  if (!posting) redirect("/console/jobs");

  const [{ value: applicants }] = await db
    .select({ value: count() })
    .from(jobApplications)
    .where(eq(jobApplications.jobId, id));

  await db.delete(jobPostings).where(eq(jobPostings.id, id));

  // Cascade ikut membuang data pelamar, jadi catat siapa, apa, dan berapa banyak.
  await db.insert(auditLogs).values({
    actorUserId: session.user.id,
    entityType: "job_posting",
    entityId: id,
    action: "deleted",
    beforeJson: { title: posting.title, company: posting.company, applicants },
    afterJson: null,
  });

  revalidatePath("/console/jobs");
  revalidatePublicJobs(id);
  redirect(withFlash("/console/jobs", "Lowongan dihapus."));
}

export async function updateJobApplicationStatus(formData: FormData) {
  const session = await requireModuleAccess("career");
  const id = readId(formData);
  const status = String(formData.get("status") ?? "");
  if (!isJobApplicationStatus(status)) throw new Error("Status tidak valid.");
  // Notifikasi ke pelamar tidak bisa ditarik, jadi bisa dimatikan per simpan
  // (pola yang sama dengan notifyApplicant di updateMembershipStatus).
  const notifyApplicant = formData.get("notifyApplicant") !== null;

  const [before] = await db
    .select({
      status: jobApplications.status,
      userId: jobApplications.userId,
      jobId: jobApplications.jobId,
    })
    .from(jobApplications)
    .where(eq(jobApplications.id, id));
  if (!before) throw new Error("Lamaran tidak ditemukan.");

  await db.update(jobApplications).set({ status }).where(eq(jobApplications.id, id));

  // Hanya saat status benar-benar berubah; menyimpan ulang status yang sama
  // tidak boleh mencatat atau mengirim apa pun lagi.
  if (before.status !== status) {
    await db.insert(auditLogs).values({
      actorUserId: session.user.id,
      entityType: "job_application",
      entityId: id,
      action: "status_changed",
      beforeJson: { status: before.status },
      afterJson: { status, notified: notifyApplicant },
    });

    // Kegagalan notifikasi tidak boleh membatalkan perubahan status yang
    // sudah tersimpan.
    if (notifyApplicant) {
      try {
        const [job] = await db
          .select({ title: jobPostings.title })
          .from(jobPostings)
          .where(eq(jobPostings.id, before.jobId));
        await createTemplatedNotification({
          userId: before.userId,
          templateKey: "job_application_status_changed",
          variables: {
            jobTitle: job?.title ?? "lowongan",
            statusLabel: JOB_APPLICATION_STATUS_LABEL[status],
          },
          relatedEntityType: "job",
          relatedEntityId: before.jobId,
        });
      } catch (err) {
        console.error("[jobs] failed to notify applicant of status change:", err);
      }
    }
  }

  revalidatePath(`/console/jobs/${before.jobId}`);
  revalidatePath(`/console/jobs/${before.jobId}/applicants/${id}`);
  revalidatePath(`/jobs/${before.jobId}/applied`);
}

// Hapus satu lamaran (mis. pelamar meminta datanya dibuang). Jangan diganti
// dengan menghapus seluruh lowongan, karena itu membuang lamaran orang lain juga.
// Berkas CV yang diunggah (Blob publik) TIDAK ikut terhapus: repo belum punya
// penghapusan Blob, dan resumeUrl berasal dari input pelamar sehingga
// menghapusnya otomatis bisa mengenai berkas lain. Lihat SOP "karier".
export async function deleteJobApplication(formData: FormData) {
  const session = await requireModuleAccess("career");
  const id = readId(formData);

  const [removed] = await db
    .delete(jobApplications)
    .where(eq(jobApplications.id, id))
    .returning({ jobId: jobApplications.jobId, status: jobApplications.status });
  // Sudah hilang (klik ganda, tab lama): tujuannya tercapai, kembali ke daftar.
  if (!removed) redirect("/console/jobs");

  await db.insert(auditLogs).values({
    actorUserId: session.user.id,
    entityType: "job_application",
    entityId: id,
    action: "deleted",
    beforeJson: { jobId: removed.jobId, status: removed.status },
    afterJson: null,
  });

  revalidatePath("/console/jobs");
  revalidatePath(`/console/jobs/${removed.jobId}`);
  revalidatePath(`/jobs/${removed.jobId}/applied`);
  redirect(withFlash(`/console/jobs/${removed.jobId}`, "Lamaran dihapus."));
}

// Terpisah dari status: menyimpan catatan tidak boleh ikut menimpa status yang
// mungkin baru diubah pengurus lain dari tab lain.
export async function updateJobApplicationNote(formData: FormData) {
  await requireModuleAccess("career");
  const id = readId(formData);
  const note = String(formData.get("reviewNote") ?? "").trim();

  const [updated] = await db
    .update(jobApplications)
    .set({ reviewNote: note || null })
    .where(eq(jobApplications.id, id))
    .returning({ jobId: jobApplications.jobId });
  if (!updated) throw new Error("Lamaran tidak ditemukan.");

  revalidatePath(`/console/jobs/${updated.jobId}/applicants/${id}`);
}
