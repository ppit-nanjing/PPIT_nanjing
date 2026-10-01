"use client";

import { useActionState, useState } from "react";
import type { JobFormState } from "@/app/actions/jobs";
import { JOB_TYPES, JOB_TYPE_LABEL } from "@/lib/job-application";
import { CheckboxField, RadioGroupField, SelectField, TextAreaField, TextField } from "@/components/console/form";
import { useActionToast } from "@/components/console/submit-button";

// Form buat/ubah lowongan. Client component supaya error validasi dari
// upsertJobPosting tampil inline (useActionState) tanpa memicu error boundary.
//
// React 19 mereset kolom uncontrolled begitu aksi form selesai, juga saat aksi
// mengembalikan error. Karena itu server mengembalikan isian yang dikirim
// (state.values) dan setiap kolom memakainya sebagai defaultValue: reset
// kembali ke nilai yang tadi diketik, bukan ke kosong. Tanpa ini satu salah
// ketik di tautan mengosongkan seluruh form, dan percobaan berikutnya bisa
// terkirim sebagai "Lewat form PPIT" sehingga tautannya hilang tanpa pesan
// (ketahuan lewat uji langsung di produksi).
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
    applyUrl: string;
  };
  submitLabel: string;
  isNew: boolean;
}) {
  const [state, formAction, isPending] = useActionState<JobFormState, FormData>(action, {});
  useActionToast(isPending, state.error, "Lowongan tersimpan.");
  const initialMode = initial?.applyUrl ? "external" : "internal";
  // Hanya untuk menampilkan isian tautan; yang dikirim tetap nilai radio di DOM.
  const [applyMode, setApplyMode] = useState<"internal" | "external">(initialMode);
  const v = state.values;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error && (
        <p role="alert" className="bg-error-container/40 text-on-error-container text-body-md px-4 py-3 rounded-lg">
          {state.error}
        </p>
      )}

      <TextField name="title" label="Judul lowongan" required defaultValue={v?.title ?? initial?.title} placeholder="mis. Software Engineer Intern" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField name="company" label="Perusahaan" required defaultValue={v?.company ?? initial?.company} />
        <TextField name="location" label="Lokasi" defaultValue={v?.location ?? initial?.location} placeholder="mis. Nanjing, China" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SelectField
          name="type"
          label="Jenis pekerjaan"
          required
          defaultValue={v?.type ?? initial?.type}
          placeholder="Pilih jenis"
          options={JOB_TYPES.map((value) => ({ value, label: JOB_TYPE_LABEL[value] }))}
        />
        <TextField
          name="applicationDeadline"
          type="date"
          label="Batas lamaran"
          hint="Kosongkan bila tidak ada batas."
          defaultValue={v?.applicationDeadline ?? initial?.applicationDeadline}
        />
      </div>
      <TextAreaField name="description" label="Deskripsi" rows={7} defaultValue={v?.description ?? initial?.description} />
      <TextAreaField name="requirements" label="Persyaratan" rows={5} defaultValue={v?.requirements ?? initial?.requirements} />

      <RadioGroupField
        name="applyMode"
        label="Cara melamar"
        defaultValue={v?.applyMode ?? initialMode}
        onChange={(mode) => setApplyMode(mode === "external" ? "external" : "internal")}
        options={[
          {
            value: "internal",
            label: "Lewat form PPIT",
            hint: "Pelamar mengunggah CV di sini dan kamu meninjaunya di console.",
          },
          {
            value: "external",
            label: "Lewat situs perusahaan",
            hint: "Pelamar diarahkan ke tautan perusahaan. Tidak ada daftar pelamar, status, atau notifikasi di PPIT, hanya jumlah klik.",
          },
        ]}
      />
      {applyMode === "external" && (
        <TextField
          name="applyUrl"
          type="url"
          required
          label="Tautan lamaran perusahaan"
          placeholder="https://..."
          defaultValue={v?.applyUrl ?? initial?.applyUrl}
          hint="Harus https dan mengarah ke situs resmi perusahaan. Buka tautannya di tab baru dulu dan pastikan halamannya benar (kalau bisa dari jaringan di Tiongkok). Setelah disimpan, tautannya bisa diuji lagi dari halaman ini. Lamaran yang sudah masuk lewat PPIT tetap tersimpan di console."
        />
      )}

      {isNew && (
        <CheckboxField
          name="open"
          defaultChecked={v ? v.open : true}
          label="Langsung buka untuk pelamar"
          hint="Kalau dikosongkan, lowongan tersimpan tertutup: tidak tampil di daftar Karir, tapi halamannya tetap bisa dibaca lewat tautannya. Jangan bagikan tautannya sebelum dibuka."
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
