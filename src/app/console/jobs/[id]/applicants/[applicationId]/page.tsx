import { and, desc, eq } from "drizzle-orm";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { auditLogs, jobApplications, jobPostings, sensusProfiles, users } from "@/db/schema";
import { requireModuleAccess } from "@/lib/admin-scope";
import {
  isHttpUrl,
  JOB_APPLICATION_STATUSES,
  JOB_APPLICATION_STATUS_LABEL,
  type JobApplicationStatus,
} from "@/lib/job-application";
import { UUID_RE } from "@/lib/uuid";
import { pathnameFromPrivateFileUrl } from "@/lib/private-files";
import {
  deleteJobApplication,
  updateJobApplicationNote,
  updateJobApplicationStatus,
} from "@/app/actions/jobs";
import { ConfirmButton } from "@/components/console/confirm-button";
import { CheckboxField, Select } from "@/components/console/form";
import { SubmitButton } from "@/components/console/submit-button";
import { CollapsibleSection } from "@/components/console/collapsible-section";

// Nama berkas untuk teks tautan. resumeUrl berasal dari input pelamar, jadi
// decodeURIComponent bisa melempar (mis. "%" menggantung) dan segmen terakhir
// bisa kosong (URL berakhiran "/"); keduanya jatuh ke URL utuh.
function resumeLabel(url: string): string {
  try {
    // Base dummy: berkas unggahan berupa path relatif (/api/files/resume/...).
    const last = new URL(url, "https://x.invalid").pathname.split("/").filter(Boolean).pop();
    if (last) return decodeURIComponent(last);
  } catch {
    // jatuh ke URL apa adanya
  }
  return url;
}

export default async function JobApplicantPage({
  params,
}: {
  params: Promise<{ id: string; applicationId: string }>;
}) {
  await requireModuleAccess("career");
  const { id, applicationId } = await params;
  if (!UUID_RE.test(id) || !UUID_RE.test(applicationId)) notFound();

  // Riwayat hanya butuh applicationId, jadi tidak perlu menunggu query pelamar.
  const history = db
    .select({
      action: auditLogs.action,
      afterJson: auditLogs.afterJson,
      createdAt: auditLogs.createdAt,
      actorName: users.name,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.actorUserId, users.id))
    .where(and(eq(auditLogs.entityType, "job_application"), eq(auditLogs.entityId, applicationId)))
    .orderBy(desc(auditLogs.createdAt))
    .limit(10);

  const applicant = db
    .select({
      id: jobApplications.id,
      jobId: jobApplications.jobId,
      status: jobApplications.status,
      resumeUrl: jobApplications.resumeUrl,
      coverLetter: jobApplications.coverLetter,
      reviewNote: jobApplications.reviewNote,
      appliedAt: jobApplications.appliedAt,
      jobTitle: jobPostings.title,
      company: jobPostings.company,
      accountName: users.name,
      email: users.email,
      fullName: sensusProfiles.fullName,
    })
    .from(jobApplications)
    .innerJoin(jobPostings, eq(jobPostings.id, jobApplications.jobId))
    .innerJoin(users, eq(users.id, jobApplications.userId))
    .leftJoin(sensusProfiles, eq(sensusProfiles.userId, jobApplications.userId))
    .where(and(eq(jobApplications.id, applicationId), eq(jobApplications.jobId, id)))
    .limit(1);

  const [[app], historyRows] = await Promise.all([applicant, history]);
  if (!app) notFound();

  const applicantName = app.fullName ?? app.accountName ?? app.email;

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10 max-w-3xl">
      <Link
        href={`/console/jobs/${id}`}
        className="text-label-caps text-secondary uppercase hover:text-on-background"
      >
        &larr; Kembali ke {app.jobTitle}
      </Link>
      <h1 className="text-headline-md sm:text-headline-lg text-on-background mt-2 mb-1">{applicantName}</h1>
      <p className="text-body-md text-on-surface-variant mb-8">
        Melamar {app.jobTitle} di {app.company} &middot;{" "}
        {new Date(app.appliedAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
      </p>

      <CollapsibleSection title="Data Pelamar">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl divide-y divide-outline-variant">
          <div className="px-6 py-4">
            <p className="text-label-caps uppercase tracking-wide text-on-surface-variant">Email</p>
            <p className="text-body-md text-on-background mt-1 break-all">{app.email}</p>
          </div>
          <div className="px-6 py-4">
            <p className="text-label-caps uppercase tracking-wide text-on-surface-variant">CV / Resume</p>
            {app.resumeUrl && (isHttpUrl(app.resumeUrl) || pathnameFromPrivateFileUrl(app.resumeUrl)) ? (
              <a
                href={app.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-body-md text-primary-container underline mt-1 break-all"
              >
                {resumeLabel(app.resumeUrl)}
                <ExternalLink size={13} aria-hidden />
              </a>
            ) : app.resumeUrl ? (
              // Bukan http(s): tampilkan sebagai teks saja, jangan jadikan tautan.
              <p className="text-body-md text-on-background mt-1 break-all">{app.resumeUrl}</p>
            ) : (
              <p className="text-body-md text-on-background mt-1">-</p>
            )}
          </div>
          <div className="px-6 py-4">
            <p className="text-label-caps uppercase tracking-wide text-on-surface-variant">Cover Letter</p>
            <p className="text-body-md text-on-background whitespace-pre-wrap mt-1">{app.coverLetter || "-"}</p>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Tindakan Pengurus" className="mt-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <form
            action={updateJobApplicationStatus}
            className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6"
          >
            <h2 className="text-headline-md text-on-background mb-4">Status</h2>
            <input type="hidden" name="id" value={app.id} />
            <Select
              name="status"
              defaultValue={app.status}
              className="w-full"
              aria-label="Status lamaran"
              options={JOB_APPLICATION_STATUSES.map((value) => ({
                value,
                label: JOB_APPLICATION_STATUS_LABEL[value],
              }))}
            />
            <p className="text-label-caps text-on-surface-variant mt-3">
              Notifikasi ke pelamar hanya dikirim saat status benar-benar berubah, dan tidak bisa ditarik.
              Menyimpan ulang status yang sama tidak mengirim apa pun.
            </p>
            <CheckboxField
              name="notifyApplicant"
              defaultChecked
              label="Kirim notifikasi ke pelamar saat status berubah"
              className="mt-3 text-on-background"
            />
            <SubmitButton
              successMessage="Status lamaran tersimpan."
              className="mt-4 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
            >
              Simpan Status
            </SubmitButton>
          </form>

          <form
            action={updateJobApplicationNote}
            className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6"
          >
            <h2 className="text-headline-md text-on-background mb-4">Catatan Pengurus</h2>
            <input type="hidden" name="id" value={app.id} />
            <textarea
              name="reviewNote"
              rows={4}
              defaultValue={app.reviewNote ?? ""}
              placeholder="Catatan internal (tidak terlihat oleh pelamar)"
              aria-label="Catatan pengurus"
              className="bg-soft-gray rounded-md p-3 text-body-md w-full resize-none"
            />
            <SubmitButton
              successMessage="Catatan tersimpan."
              className="mt-4 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
            >
              Simpan Catatan
            </SubmitButton>
          </form>
        </div>
      </CollapsibleSection>

      {historyRows.length > 0 && (
        <CollapsibleSection title="Riwayat Status" className="mt-8">
          <ul className="flex flex-col gap-2">
            {historyRows.map((log, i) => {
              const after = (log.afterJson as { status?: string; notified?: boolean } | null) ?? {};
              return (
                <li key={`${log.createdAt.toISOString()}-${i}`} className="text-body-md text-on-surface-variant">
                  <span className="text-on-background">{log.actorName ?? "Pengurus"}</span> mengubah status
                  menjadi{" "}
                  <span className="text-on-background">
                    {JOB_APPLICATION_STATUS_LABEL[after.status as JobApplicationStatus] ?? after.status ?? "-"}
                  </span>
                  {" · "}
                  {new Date(log.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                  {after.notified === false && <span className="text-label-caps"> · pelamar tidak diberi notifikasi</span>}
                </li>
              );
            })}
          </ul>
        </CollapsibleSection>
      )}

      <div className="mt-8">
        <ConfirmButton
          title="Hapus lamaran ini?"
          message={`Lamaran ${applicantName} untuk ${app.jobTitle} dihapus permanen, termasuk catatan pengurus. Lamaran lain tidak terpengaruh. Berkas CV yang diunggah TIDAK ikut terhapus dari penyimpanan; kalau pelamar meminta datanya dibuang, hapus juga berkasnya (lihat SOP Lowongan).`}
          action={deleteJobApplication}
          payload={{ id: app.id }}
          className="text-label-caps uppercase tracking-wide text-error hover:opacity-80 px-3 py-2 rounded-md hover:bg-error-container/30 transition-colors"
        >
          Hapus Lamaran
        </ConfirmButton>
      </div>
    </div>
  );
}
