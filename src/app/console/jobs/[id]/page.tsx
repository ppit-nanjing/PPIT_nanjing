import { desc, eq } from "drizzle-orm";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { jobApplications, jobPostings, sensusProfiles, users } from "@/db/schema";
import { requireModuleAccess } from "@/lib/admin-scope";
import {
  isHttpsUrl,
  JOB_APPLICATION_STATUS_LABEL,
  JOB_TYPE_LABEL,
  type JobApplicationStatus,
  type JobType,
} from "@/lib/job-application";
import { deleteJobPosting, setJobPostingStatus, upsertJobPosting } from "@/app/actions/jobs";
import { JobPostingForm } from "@/components/console/job-posting-form";
import { CollapsibleSection } from "@/components/console/collapsible-section";
import { ConfirmButton } from "@/components/console/confirm-button";
import { FlashToast } from "@/components/console/flash-toast";
import { getSiteUrl } from "@/lib/site-url";
import { UUID_RE } from "@/lib/uuid";

const GHOST_BTN =
  "text-label-caps uppercase tracking-wide px-3 py-2 rounded-md border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-colors";

export default async function EditJobPostingPage({ params }: { params: Promise<{ id: string }> }) {
  await requireModuleAccess("career");
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const jobQuery = db.select().from(jobPostings).where(eq(jobPostings.id, id));
  const applicantsQuery = db
    .select({
      id: jobApplications.id,
      status: jobApplications.status,
      appliedAt: jobApplications.appliedAt,
      accountName: users.name,
      email: users.email,
      fullName: sensusProfiles.fullName,
    })
    .from(jobApplications)
    .innerJoin(users, eq(users.id, jobApplications.userId))
    .leftJoin(sensusProfiles, eq(sensusProfiles.userId, jobApplications.userId))
    .where(eq(jobApplications.jobId, id))
    .orderBy(desc(jobApplications.appliedAt));

  const [[job], applicants] = await Promise.all([jobQuery, applicantsQuery]);
  if (!job) notFound();

  const isOpen = job.status === "open";

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10 max-w-3xl">
      <FlashToast />
      <div className="flex items-center justify-between gap-3 mb-4">
        <Link
          href="/console/jobs"
          className="inline-flex items-center gap-2 text-label-caps uppercase tracking-wide text-on-surface-variant hover:text-on-background"
        >
          <ArrowLeft size={16} /> Kembali
        </Link>
        {isOpen && (
          <a
            href={`${getSiteUrl()}/jobs/${job.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-label-caps uppercase tracking-wide text-primary-container hover:text-primary transition-colors"
          >
            Lihat publik <ExternalLink size={13} aria-hidden />
          </a>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-headline-md sm:text-headline-lg text-on-background">Edit Lowongan</h1>
          <span className="text-label-caps uppercase tracking-wide bg-surface-container-low text-on-surface-variant px-2 py-1 rounded">
            {isOpen ? "Dibuka" : "Ditutup"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ConfirmButton
            title={isOpen ? "Tutup lowongan?" : "Buka lowongan lagi?"}
            message={
              isOpen
                ? "Lowongan disembunyikan dari halaman Karir publik. Lamaran yang sudah masuk tetap tersimpan."
                : "Lowongan tampil lagi di halaman Karir publik dan bisa dilamar."
            }
            confirmLabel={isOpen ? "Ya, tutup" : "Ya, buka"}
            action={setJobPostingStatus}
            payload={{ id: job.id, status: isOpen ? "closed" : "open" }}
            danger={false}
            className={GHOST_BTN}
          >
            {isOpen ? "Tutup" : "Buka lagi"}
          </ConfirmButton>
          <ConfirmButton
            title="Hapus lowongan?"
            message={`"${job.title}" dan ${applicants.length} lamarannya dihapus permanen. Berkas CV yang sudah diunggah pelamar tidak ikut terhapus dari penyimpanan. Untuk lowongan yang sekadar sudah selesai, pakai Tutup.`}
            action={deleteJobPosting}
            payload={{ id: job.id }}
            className="text-label-caps uppercase tracking-wide text-error hover:opacity-80 px-3 py-2 rounded-md hover:bg-error-container/30 transition-colors"
          >
            Hapus
          </ConfirmButton>
        </div>
      </div>

      {job.applyUrl && (
        <div className="mb-6 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3">
          <p className="text-label-caps uppercase tracking-wide text-on-surface-variant">
            Lamaran lewat situs perusahaan
          </p>
          {isHttpsUrl(job.applyUrl) ? (
            <a
              href={job.applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-body-md text-primary-container underline break-all"
            >
              {job.applyUrl}
            </a>
          ) : (
            // Nilai yang tidak lolos cek (mis. diubah langsung di database): teks saja.
            <p className="text-body-md text-on-background break-all">{job.applyUrl}</p>
          )}
          <p className="text-body-sm text-on-surface-variant mt-1">
            {job.externalClicks} klik dari anggota yang login. Lamaran tidak masuk ke PPIT, jadi tidak ada daftar
            pelamar baru di bawah.
          </p>
        </div>
      )}

      <JobPostingForm
        action={upsertJobPosting.bind(null, job.id)}
        submitLabel="Simpan Perubahan"
        isNew={false}
        initial={{
          title: job.title,
          company: job.company,
          location: job.location ?? "",
          type: job.type,
          applicationDeadline: job.applicationDeadline ?? "",
          description: job.description ?? "",
          requirements: job.requirements ?? "",
          applyUrl: job.applyUrl ?? "",
        }}
      />

      <CollapsibleSection
        title={`Pelamar (${applicants.length})`}
        description={`${JOB_TYPE_LABEL[job.type as JobType]} di ${job.company}`}
        className="mt-10"
      >
        {applicants.length === 0 ? (
          <p className="text-body-md text-on-surface-variant">Belum ada yang melamar.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {applicants.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/console/jobs/${job.id}/applicants/${a.id}`}
                  className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border border-outline-variant rounded-lg px-4 py-3 hover:bg-surface-container-low transition-colors"
                >
                  <span className="min-w-0">
                    <span className="block text-body-md text-on-background truncate">
                      {a.fullName ?? a.accountName ?? a.email}
                    </span>
                    <span className="block text-body-sm text-on-surface-variant truncate">
                      {a.email} &middot;{" "}
                      {new Date(a.appliedAt).toLocaleDateString("id-ID", { dateStyle: "medium" })}
                    </span>
                  </span>
                  <span className="text-label-caps uppercase tracking-wide bg-surface-container-low text-on-surface-variant px-2 py-1 rounded shrink-0">
                    {JOB_APPLICATION_STATUS_LABEL[a.status as JobApplicationStatus]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CollapsibleSection>
    </div>
  );
}
