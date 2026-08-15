"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImageUploadCropper } from "@/components/upload/image-upload-cropper";
import { createContribution } from "@/app/actions/contributions";

const CONDITIONS = [
  { value: "new", label: "Baru" },
  { value: "good", label: "Baik" },
  { value: "fair", label: "Cukup Baik" },
  { value: "damaged", label: "Rusak" },
  { value: "retired", label: "Pensiun" },
];

export function ContributeForm({ categories }: { categories: string[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [lend, setLend] = useState(false);
  const [done, setDone] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await createContribution(fd);
        setDone(true);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal mengirim");
      }
    });
  }

  if (done) {
    return (
      <div className="flex items-start gap-3 bg-primary-container/10 border border-primary-container/20 rounded-lg p-5">
        <p className="text-body-md text-on-background">
          Pengajuan sumbangan/peminjaman terkirim. Admin akan meninjau dan mengabari kamu lewat notifikasi.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-xl">
      <label className="flex flex-col gap-2">
        <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Nama Barang *</span>
        <input name="name" required className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container" />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Kategori</span>
        <input
          name="category"
          list="contribution-categories"
          className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container"
        />
        <datalist id="contribution-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Deskripsi</span>
        <textarea name="description" rows={3} className="bg-soft-gray rounded-md p-3 text-body-md resize-none" />
      </label>

      <ImageUploadCropper name="imageUrl" folder="inventory" label="Foto Barang (opsional)" aspect={1} />

      <label className="flex flex-col gap-2">
        <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Kondisi</span>
        <select name="condition" defaultValue="good" className="bg-soft-gray rounded-md p-3 text-body-md">
          {CONDITIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="flex flex-col gap-2">
        <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Jenis *</span>
        <label className="flex items-center gap-2 text-body-md">
          <input type="radio" name="contributionType" value="donate" checked={!lend} onChange={() => setLend(false)} />
          Sumbangkan (permanen)
        </label>
        <label className="flex items-center gap-2 text-body-md">
          <input type="radio" name="contributionType" value="lend_to_org" checked={lend} onChange={() => setLend(true)} />
          Pinjamkan sementara
        </label>
      </fieldset>

      {lend && (
        <label className="flex flex-col gap-2">
          <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Perkiraan Tanggal Kembali</span>
          <input type="date" name="expectedReturnDate" className="bg-soft-gray rounded-md p-3 text-body-md" />
        </label>
      )}

      {error && <p className="text-body-sm text-error">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors disabled:opacity-60"
      >
        {pending ? "Mengirim..." : "Kirim Pengajuan"}
      </button>
    </form>
  );
}
