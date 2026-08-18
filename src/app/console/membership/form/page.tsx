import { asc } from "drizzle-orm";
import { db } from "@/db";
import { membershipFormFields } from "@/db/schema";
import { requireModuleAccess } from "@/lib/admin-scope";
import { MembershipTabs } from "@/components/console/membership-tabs";
import { CollapsibleSection } from "@/components/console/collapsible-section";
import { FormFieldEditor } from "@/components/console/form-field-editor";
import { QuestionBank } from "@/components/console/question-bank";
import { MembershipApplicationForm } from "@/components/membership/membership-application-form";
import { createFormField, initFormFields, getFormMeta, updateFormMeta } from "@/app/actions/membership";
import { FIELD_TYPE_LABELS, type MembershipFieldDef } from "@/lib/membership-form";

const ADD_TYPES: MembershipFieldDef["type"][] = [
  "text", "textarea", "email", "tel", "number", "select", "radio", "multiselect", "date", "checkbox", "rating", "image", "url",
];

export default async function MembershipFormPage() {
  await requireModuleAccess("membership");

  let rows = await db.select().from(membershipFormFields).orderBy(asc(membershipFormFields.orderIndex));
  if (rows.length === 0) {
    await initFormFields();
    rows = await db.select().from(membershipFormFields).orderBy(asc(membershipFormFields.orderIndex));
  }

  const fields: MembershipFieldDef[] = rows.map((r) => ({
    id: r.id,
    key: r.key,
    label: r.label,
    type: r.type as MembershipFieldDef["type"],
    placeholder: r.placeholder ?? undefined,
    helpText: r.helpText ?? undefined,
    required: r.required,
    options: r.options ? r.options.split("\n").map((s) => s.trim()).filter(Boolean) : undefined,
    config: (r.config as MembershipFieldDef["config"]) ?? undefined,
    isCore: r.isCore,
  }));

  const meta = await getFormMeta();

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <h1 className="text-headline-md sm:text-headline-lg text-on-background mb-2">Formulir Pendaftaran</h1>
      <p className="text-body-md text-on-surface-variant mb-4">
        Susun form pendaftaran seperti Google Form &mdash; tambah pertanyaan, pilih tipe, atur opsi & skala, lalu lihat
        pratinjau langsung. Perubahan langsung berlaku di halaman /join-us.
      </p>
      <MembershipTabs active="form" />

      <CollapsibleSection
        title="Setelan Formulir"
        description="Judul, deskripsi, pesan konfirmasi, mode kuis, dan tautan spreadsheet."
        className="mb-8"
        defaultOpen={false}
      >
        <form action={updateFormMeta} className="flex flex-col gap-4 max-w-2xl">
          <div className="flex flex-col gap-2">
            <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Judul Formulir</span>
            <input name="title" defaultValue={meta.title} className="bg-soft-gray rounded-md p-3 text-body-md" />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Deskripsi (tampil di atas formulir)</span>
            <textarea name="description" rows={3} defaultValue={meta.description} className="bg-soft-gray rounded-md p-3 text-body-md resize-none" />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Pesan Konfirmasi (setelah kirim)</span>
            <textarea name="confirmationMessage" rows={2} defaultValue={meta.confirmationMessage} className="bg-soft-gray rounded-md p-3 text-body-md resize-none" />
          </div>
          <label className="flex items-center gap-2 text-body-md text-on-background">
            <input type="checkbox" name="bannerEnabled" defaultChecked={meta.bannerEnabled} />
            Tampilkan banner (header besar) di halaman formulir
          </label>
          <hr className="border-outline-variant/60" />
          <p className="text-label-caps uppercase tracking-wide text-on-surface-variant">Jawaban</p>
          <label className="flex items-center gap-2 text-body-md text-on-background">
            <input type="checkbox" name="collectEmail" defaultChecked={meta.collectEmail} />
            Tanyakan alamat email lewat pertanyaan
          </label>
          <span className="text-label-caps text-on-surface-variant -mt-1">
            Kalau dimatikan, email diambil otomatis dari akun yang login. Pengunjung yang belum login tetap diminta mengisi.
          </span>
          <p className="text-label-caps uppercase tracking-wide text-on-surface-variant">Presentasi</p>
          <label className="flex items-center gap-2 text-body-md text-on-background">
            <input type="checkbox" name="shuffle" defaultChecked={meta.shuffle} />
            Acak urutan pertanyaan (kecuali data diri)
          </label>
          <label className="flex items-center gap-2 text-body-md text-on-background">
            <input type="checkbox" name="showProgress" defaultChecked={meta.showProgress} />
            Tampilkan bilah progres pengisian
          </label>
          <hr className="border-outline-variant/60" />
          <p className="text-label-caps uppercase tracking-wide text-on-surface-variant">Kuis</p>
          <label className="flex items-center gap-2 text-body-md text-on-background">
            <input type="checkbox" name="isQuiz" defaultChecked={meta.isQuiz} />
            Jadikan ini sebagai kuis (tiap soal bisa diberi poin &amp; kunci jawaban)
          </label>
          <hr className="border-outline-variant/60" />
          <p className="text-label-caps uppercase tracking-wide text-on-surface-variant">Default Pertanyaan Baru</p>
          <label className="flex items-center gap-2 text-body-md text-on-background">
            <input type="checkbox" name="defaultRequired" defaultChecked={meta.defaultRequired} />
            Pertanyaan baru otomatis ditandai &ldquo;wajib diisi&rdquo;
          </label>
          <hr className="border-outline-variant/60" />
          <div className="flex flex-col gap-2">
            <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Tautan Spreadsheet (opsional)</span>
            <input name="spreadsheetUrl" placeholder="https://docs.google.com/spreadsheets/..." defaultValue={meta.spreadsheetUrl ?? ""} className="bg-soft-gray rounded-md p-3 text-body-md" />
            <span className="text-label-caps text-on-surface-variant">Muncul sebagai tombol &ldquo;Buka Spreadsheet&rdquo; di halaman Jawaban.</span>
          </div>
          <button
            type="submit"
            className="self-start bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
          >
            Simpan Setelan
          </button>
        </form>
      </CollapsibleSection>

      <CollapsibleSection title="Panduan Membuat Formulir" className="mb-8" defaultOpen={false}>
        <ol className="list-decimal list-inside flex flex-col gap-2 text-body-md text-on-background">
          <li>
            <span className="font-medium">Tambah pertanyaan</span> &mdash; pakai <em>Bank Pertanyaan</em> di bawah (siap
            pakai, tinggal klik) atau <em>Tambah Field Baru</em> untuk bikin dari nol.
          </li>
          <li>
            <span className="font-medium">Pilih tipe</span> &mdash; teks, paragraf, email, angka, tanggal, dropdown, radio
            (pilih satu), kotak centang (pilih banyak), centang ya/tidak, skala/rating, gambar, atau URL.
          </li>
          <li>
            <span className="font-medium">Isi opsi</span> untuk dropdown / radio / kotak centang &mdash; tulis satu opsi per
            baris.
          </li>
          <li>
            <span className="font-medium">Atur skala</span> untuk rating &mdash; tentukan nilai min/max dan label rendah/tinggi.
          </li>
          <li>
            <span className="font-medium">Tandai Wajib diisi</span> kalau pertanyaan harus dijawab pelamar.
          </li>
          <li>
            <span className="font-medium">Urutkan &amp; pratinjau</span> &mdash; pakai tombol ↑/↓ lalu cek tampilannya di
            panel <em>Pratinjau Formulir</em> sebelum menyimpan.
          </li>
        </ol>
      </CollapsibleSection>

      <CollapsibleSection
        title="Tambah Field Baru"
        description="Bikin satu pertanyaan dari nol."
        className="mb-8"
        defaultOpen={false}
      >
        <form action={createFormField} className="flex flex-col gap-4 max-w-2xl">
          <div className="flex flex-col gap-2">
            <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Label Pertanyaan</span>
            <input name="label" placeholder="mis. Surat Motivasi (link)" className="bg-soft-gray rounded-md p-3 text-body-md" />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Tipe</span>
            <select name="type" className="bg-soft-gray rounded-md p-3 text-body-md">
              {ADD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {FIELD_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="self-start bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
          >
            Tambah Field
          </button>
        </form>
      </CollapsibleSection>

      <CollapsibleSection
        title="Tambah Bagian / Tahap"
        description="Bagi form jadi bagian (mis. Data Diri, Pendidikan, Motivasi) supaya tidak jadi satu dinding pertanyaan."
        className="mb-8"
        defaultOpen={false}
      >
        <form action={createFormField} className="flex flex-col gap-4 max-w-2xl">
          <div className="flex flex-col gap-2">
            <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Judul Bagian</span>
            <input name="label" placeholder="mis. Data Diri" className="bg-soft-gray rounded-md p-3 text-body-md" />
            <input type="hidden" name="type" value="section" />
          </div>
          <button
            type="submit"
            className="self-start bg-secondary-container text-on-secondary-container text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:opacity-90 transition-colors"
          >
            Tambah Bagian
          </button>
        </form>
      </CollapsibleSection>

      <CollapsibleSection
        title="Bank Pertanyaan"
        description="Pertanyaan siap pakai &mdash; klik untuk menambahkan ke formulir."
        className="mb-8"
        defaultOpen={false}
      >
        <QuestionBank />
      </CollapsibleSection>

      <CollapsibleSection
        title={`Daftar Pertanyaan (${fields.filter((f) => f.type !== "section").length} pertanyaan)`}
        description="Klik tiap kartu untuk membuka/menyusun. Tanda ▸ berarti tertutup."
        className="mb-8"
      >
        <div className="space-y-3">
          {fields.map((f, i) => {
            // Track which section a question belongs to for the overview.
            let sectionLabel: string | undefined;
            for (let j = i - 1; j >= 0; j--) {
              if (fields[j].type === "section") {
                sectionLabel = fields[j].label;
                break;
              }
            }
            return <FormFieldEditor key={f.id} field={f} index={i} sectionLabel={sectionLabel} isQuiz={meta.isQuiz} />;
          })}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Pratinjau Formulir" description="Tampilan yang dilihat pelamar. Belum bisa dikirim." defaultOpen={false}>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 max-w-2xl">
          <MembershipApplicationForm
            fields={fields}
            periodId="preview"
            defaults={{}}
            authenticated={false}
            preview
            showProgress={meta.showProgress}
            shuffle={meta.shuffle}
          />
        </div>
      </CollapsibleSection>
    </div>
  );
}
