"use client";

import { Select } from "@/components/console/form";
import { FileUpload } from "@/components/upload/file-upload";

// Biodata peserta di form pendaftaran acara requiresBiodata (mis. WIF). Dua
// tampilan:
//  - sensus lengkap: ringkasan read-only, server men-snapshot dari sensus, tidak
//    ada input yang disubmit dari sini.
//  - sensus belum lengkap: input yang bisa diisi (prefix name `bio_`), di-prefill
//    dari data sensus parsial / akun bila ada.
// Bukti mahasiswa aktif = LOA / kartu mahasiswa, folder blob "event-doc".

export type BiodataDefaults = {
  fullName?: string;
  passportNumber?: string;
  wechatId?: string;
  chinaPhone?: string;
  branch?: string;
  university?: string;
  major?: string;
  entryYear?: string;
  studentProofUrl?: string;
};

const fieldClass =
  "bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container";

export function EventBiodataFields({
  sensusComplete,
  defaults,
  cityOptions,
}: {
  sensusComplete: boolean;
  defaults: BiodataDefaults;
  cityOptions: string[];
}) {
  if (sensusComplete) {
    const rows: [string, string | undefined][] = [
      ["Nama Lengkap", defaults.fullName],
      ["Nomor Paspor", defaults.passportNumber],
      ["WeChat ID", defaults.wechatId],
      ["No. Telpon China", defaults.chinaPhone],
      ["Kota / Ranting", defaults.branch],
      ["Universitas", defaults.university],
      ["Jurusan", defaults.major],
      ["Tahun Angkatan", defaults.entryYear],
    ];
    return (
      <div className="flex flex-col gap-2 text-left bg-soft-gray rounded-md p-4">
        <p className="text-label-caps uppercase tracking-wide text-on-surface-variant">Biodata Diri</p>
        <p className="text-body-sm text-on-surface-variant">
          Diambil otomatis dari sensus kamu — tidak perlu ketik ulang. Perlu koreksi? Perbarui di halaman Sensus.
        </p>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-1">
          {rows.map(([label, value]) => (
            <div key={label} className="flex flex-col">
              <dt className="text-label-caps text-on-surface-variant">{label}</dt>
              <dd className="text-body-md text-on-background">{value || "—"}</dd>
            </div>
          ))}
          <div className="flex flex-col">
            <dt className="text-label-caps text-on-surface-variant">Bukti Mahasiswa Aktif</dt>
            <dd className="text-body-md text-on-background">{defaults.studentProofUrl ? "terlampir dari sensus" : "belum ada"}</dd>
          </div>
        </dl>
      </div>
    );
  }

  return (
    <fieldset className="flex flex-col gap-3 text-left border-0 p-0 m-0">
      <legend className="text-label-caps uppercase tracking-wide text-on-surface-variant p-0">
        Biodata Diri <span className="text-error" aria-hidden="true"> *</span>
      </legend>
      <label className="flex flex-col gap-1">
        <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Nama Lengkap *</span>
        <input name="bio_fullName" required defaultValue={defaults.fullName ?? ""} className={fieldClass} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Jurusan *</span>
        <input name="bio_major" required defaultValue={defaults.major ?? ""} className={fieldClass} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Nomor Paspor *</span>
        <input name="bio_passportNumber" required defaultValue={defaults.passportNumber ?? ""} className={fieldClass} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">WeChat ID *</span>
        <input name="bio_wechatId" required defaultValue={defaults.wechatId ?? ""} className={fieldClass} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">No. Telpon China *</span>
        <input
          name="bio_chinaPhone"
          required
          defaultValue={defaults.chinaPhone ?? ""}
          placeholder="+86 1234 5678"
          className={fieldClass}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Kota / Ranting *</span>
        <Select name="bio_branch" required defaultValue={defaults.branch ?? ""} placeholder="Pilih kota" className="w-full">
          {cityOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">
          Asal Universitas / Institusi Pendidikan *
        </span>
        <input
          name="bio_university"
          required
          defaultValue={defaults.university ?? ""}
          placeholder="Dalam Bahasa Inggris, mis. Nanjing University of Posts and Telecommunications"
          className={fieldClass}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Tahun Angkatan *</span>
        <input name="bio_entryYear" required defaultValue={defaults.entryYear ?? ""} placeholder="2026" className={fieldClass} />
      </label>
      <div className="flex flex-col gap-1">
        <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Bukti Tanda Mahasiswa Aktif *</span>
        <FileUpload
          name="bio_studentProofUrl"
          folder="event-doc"
          required
          autoUpload
          accept="application/pdf,.doc,.docx,image/*"
          defaultValue={defaults.studentProofUrl ?? ""}
          hint="LOA / kartu mahasiswa. Unggah 1 berkas: PDF, dokumen, atau gambar. Maks 10 MB."
        />
      </div>
    </fieldset>
  );
}
