"use server";

import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { auditLogs, jobApplications, jobPostings } from "@/db/schema";
import { requireModuleAccess } from "@/lib/admin-scope";
import { requireCompletedSensus } from "@/lib/sensus-gate";
import { createTemplatedNotification } from "@/lib/notifications";
import { withFlash } from "@/lib/flash";
import {
  isJobApplicationStatus,
  isJobType,
  JOB_APPLICATION_STATUS_LABEL,
} from "@/lib/job-application";

export async function applyToJob(jobId: string, formData: FormData) {
  const session = await requireCompletedSensus(`/jobs/${jobId}/apply`);

  const resumeUrl = String(formData.get("resumeUrl") ?? "").trim();
  const coverLetter = String(formData.get("coverLetter") ?? "").trim();
  if (!resumeUrl) throw new Error("Tautan resume/CV wajib diisi");

  const [existing] = await db
    .select()
    .from(jobApplications)
    .where(and(eq(jobApplications.jobId, jobId), eq(jobApplications.userId, session.user.id)));

  if (existing) redirect(`/jobs/${jobId}/applied`);

  const [job] = await db
    .select({ title: jobPostings.title, status: jobPostings.status })
    .from(jobPostings)
    .where(eq(jobPostings.id, jobId));
  // Menutup lowongan di console harus benar-benar menghentikan lamaran baru,
  // bukan hanya menyembunyikan tombolnya.
  if (!job || job.status !== "open") redirect(`/jobs/${jobId}`);

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

export type JobFormState = { error?: string };

// Bentuk YYYY-MM-DD saja tidak cukup ("2026-13-45" lolos); round-trip lewat Date
// memastikan tanggalnya ada, karena Postgres akan melempar error untuk yang tidak valid.
function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
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

  if (!title) return { error: "Judul lowongan wajib diisi." };
  if (!company) return { error: "Nama perusahaan wajib diisi." };
  if (!isJobType(type)) return { error: "Pilih jenis pekerjaan." };
  if (deadline && !isValidIsoDate(deadline)) return { error: "Batas lamaran bukan tanggal yang valid." };

  const values = {
    title,
    company,
    location: location || null,
    type,
    description: description || null,
    requirements: requirements || null,
    applicationDeadline: deadline || null,
  };

  let jobId: string;
  if (existingId) {
    const [updated] = await db
      .update(jobPostings)
      .set(values)
      .where(eq(jobPostings.id, existingId))
      .returning({ id: jobPostings.id });
    if (!updated) return { error: "Lowongan tidak ditemukan (mungkin sudah dihapus)." };
    jobId = updated.id;
  } else {
    // Lowongan baru langsung dibuka kecuali kotaknya sengaja dikosongkan
    // (status "closed" berfungsi sebagai draf karena enumnya hanya open/closed).
    const [created] = await db
      .insert(jobPostings)
      .values({
        ...values,
        postedBy: session.user.id,
        status: formData.get("open") === "on" ? "open" : "closed",
      })
      .returning({ id: jobPostings.id });
    jobId = created.id;
  }

  revalidatePath("/console/jobs");
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
  redirect(withFlash("/console/jobs", "Lowongan tersimpan."));
}

// Buka/tutup tanpa menyentuh isi lowongan. Dipakai dari ConfirmButton di
// server component, jadi menerima FormData.
export async function setJobPostingStatus(formData: FormData) {
  await requireModuleAccess("career");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || (status !== "open" && status !== "closed")) throw new Error("Permintaan tidak valid.");

  const [updated] = await db
    .update(jobPostings)
    .set({ status })
    .where(eq(jobPostings.id, id))
    .returning({ id: jobPostings.id });
  if (!updated) throw new Error("Lowongan tidak ditemukan.");

  revalidatePath("/console/jobs");
  revalidatePath(`/console/jobs/${id}`);
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${id}`);
}

// Hapus permanen, termasuk semua lamarannya (FK cascade). Untuk lowongan salah
// input atau spam; untuk lowongan yang sekadar sudah selesai, pakai Tutup.
export async function deleteJobPosting(formData: FormData) {
  await requireModuleAccess("career");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Permintaan tidak valid.");

  await db.delete(jobPostings).where(eq(jobPostings.id, id));

  revalidatePath("/console/jobs");
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${id}`);
  redirect(withFlash("/console/jobs", "Lowongan dihapus."));
}

export async function updateJobApplicationStatus(formData: FormData) {
  const session = await requireModuleAccess("career");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !isJobApplicationStatus(status)) throw new Error("Status tidak valid.");

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

  const statusChanged = before.status !== status;

  // Hanya saat status benar-benar berubah; menyimpan ulang status yang sama
  // tidak boleh mengirim notifikasi lagi. Kegagalan notifikasi tidak boleh
  // membatalkan perubahan status yang sudah tersimpan.
  if (statusChanged) {
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

  if (statusChanged) {
    await db.insert(auditLogs).values({
      actorUserId: session.user.id,
      entityType: "job_application",
      entityId: id,
      action: "status_changed",
      beforeJson: { status: before.status },
      afterJson: { status },
    });
  }

  revalidatePath(`/console/jobs/${before.jobId}`);
  revalidatePath(`/console/jobs/${before.jobId}/applicants/${id}`);
  revalidatePath(`/jobs/${before.jobId}/applied`);
}

// Hapus satu lamaran (mis. pelamar meminta datanya dibuang). Jangan diganti
// dengan menghapus seluruh lowongan, karena itu membuang lamaran orang lain juga.
export async function deleteJobApplication(formData: FormData) {
  const session = await requireModuleAccess("career");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Permintaan tidak valid.");

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

  revalidatePath(`/console/jobs/${removed.jobId}`);
  redirect(withFlash(`/console/jobs/${removed.jobId}`, "Lamaran dihapus."));
}

// Terpisah dari status: menyimpan catatan tidak boleh ikut menimpa status yang
// mungkin baru diubah pengurus lain dari tab lain.
export async function updateJobApplicationNote(formData: FormData) {
  await requireModuleAccess("career");
  const id = String(formData.get("id") ?? "");
  const note = String(formData.get("reviewNote") ?? "").trim();
  if (!id) throw new Error("Permintaan tidak valid.");

  const [updated] = await db
    .update(jobApplications)
    .set({ reviewNote: note || null })
    .where(eq(jobApplications.id, id))
    .returning({ jobId: jobApplications.jobId });
  if (!updated) throw new Error("Lamaran tidak ditemukan.");

  revalidatePath(`/console/jobs/${updated.jobId}/applicants/${id}`);
}
