import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { requireModuleAccess } from "@/lib/admin-scope";
import { upsertJobPosting } from "@/app/actions/jobs";
import { JobPostingForm } from "@/components/console/job-posting-form";

export default async function NewJobPostingPage() {
  await requireModuleAccess("career");

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10 max-w-2xl">
      <Link
        href="/console/jobs"
        className="inline-flex items-center gap-2 text-label-caps uppercase tracking-wide text-on-surface-variant hover:text-on-background mb-4"
      >
        <ArrowLeft size={16} /> Kembali
      </Link>
      <h1 className="text-headline-md sm:text-headline-lg text-on-background mb-6">Tambah Lowongan</h1>
      <JobPostingForm action={upsertJobPosting.bind(null, null)} submitLabel="Simpan" isNew />
    </div>
  );
}
