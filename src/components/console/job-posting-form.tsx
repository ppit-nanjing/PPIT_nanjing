"use client";

import { useActionState } from "react";
import type { JobFormState } from "@/app/actions/jobs";
import { JOB_TYPES, JOB_TYPE_LABEL } from "@/lib/job-application";
import { CheckboxField, SelectField, TextAreaField, TextField } from "@/components/console/form";
import { useActionToast } from "@/components/console/submit-button";

// Form buat/ubah lowongan. Client component supaya error validasi dari
// upsertJobPosting tampil inline (useActionState), bukan membuang isian ke
// error boundary.
export function JobPostingForm({
  action,
  initial,
  submitLabel,
  isNew,
}: {
  action: (prev: JobFormState, formData: FormData) => Promise<JobFormState>;
  initial?: {
    title: string;
    company: string;
    location: string;
    type: string;
    applicationDeadline: string;
    description: string;
    requirements: string;
  };
  submitLabel: string;
  isNew: boolean;
}) {
  const [state, formAction, isPending] = useActionState<JobFormState, FormData>(action, {});
  useActionToast(isPending, state.error, "Lowongan tersimpan.");

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error && (
        <p role="alert" className="bg-error-container/40 text-on-error-container text-body-md px-4 py-3 rounded-lg">
          {state.error}
        </p>
      )}

      <TextField name="title" label="Judul lowongan" required defaultValue={initial?.title} placeholder="mis. Software Engineer Intern" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField name="company" label="Perusahaan" required defaultValue={initial?.company} />
        <TextField name="location" label="Lokasi" defaultValue={initial?.location} placeholder="mis. Nanjing, China" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SelectField
          name="type"
          label="Jenis pekerjaan"
          required
          defaultValue={initial?.type}
          placeholder="Pilih jenis"
          options={JOB_TYPES.map((value) => ({ value, label: JOB_TYPE_LABEL[value] }))}
        />
        <TextField
          name="applicationDeadline"
          type="date"
          label="Batas lamaran"
          hint="Kosongkan bila tidak ada batas."
          defaultValue={initial?.applicationDeadline}
        />
      </div>
      <TextAreaField name="description" label="Deskripsi" rows={7} defaultValue={initial?.description} />
      <TextAreaField name="requirements" label="Persyaratan" rows={5} defaultValue={initial?.requirements} />

      {isNew && (
        <CheckboxField
          name="open"
          defaultChecked
          label="Langsung buka untuk pelamar (kosongkan untuk menyimpan sebagai draf tertutup)"
          className="text-on-background"
        />
      )}

      <button
        type="submit"
        disabled={isPending}
        className="self-start bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors disabled:opacity-60"
      >
        {submitLabel}
      </button>
    </form>
  );
}
