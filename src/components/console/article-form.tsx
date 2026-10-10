import { upsertHelpArticle } from "@/app/actions/admin-docs";
import { CollapsibleSection } from "@/components/console/collapsible-section";
import { FormActions, SelectField, TextField, ToggleSwitch, primaryBtn } from "@/components/console/form";
import { MarkdownEditor } from "@/components/console/markdown-editor";
import { SubmitButton } from "@/components/console/submit-button";
import { GUIDE_PHASES } from "@/lib/guidebook-topic";

const SECTIONS = ["Sering Dipakai", "Sering Membingungkan"];

// Opsi kosong yang BISA dipilih: artikel boleh berhenti jadi topik guidebook
// kapan saja, jadi fase tidak boleh terkunci seperti placeholder <select> biasa.
const PHASE_OPTIONS = [
  { value: "", label: "— bukan topik guidebook —" },
  ...GUIDE_PHASES.map((p) => ({ value: p.value, label: p.label })),
];

const EXPIRY_OPTIONS = [
  { value: "keep", label: "Biarkan seperti sekarang" },
  { value: "3", label: "3 bulan dari sekarang" },
  { value: "6", label: "6 bulan dari sekarang" },
  { value: "12", label: "12 bulan dari sekarang" },
  { value: "none", label: "Cabut masa berlaku" },
];

type ArticleValues = {
  id: string;
  title: string;
  section: string;
  content: string | null;
  isPublic: boolean;
  phase: string | null;
  sortOrder: number;
  sourceLabel: string | null;
  sourceDocSlug: string | null;
  reviewedAt: Date | null;
  expiresAt: Date | null;
};

/**
 * Satu formulir artikel untuk /console/docs/new dan /console/docs/[slug].
 * Dipakai bersama supaya kolom guidebook tidak bisa cuma ada di salah satu
 * jalur - dulu dua halaman ini menyalin field yang sama dan mulai berbeda.
 */
export function ArticleForm({
  article,
  signature,
  submitLabel,
  successMessage,
}: {
  /** Kosong = artikel baru. */
  article?: ArticleValues;
  /** Tanda tangan isi dari database; jadi kunci optimistis saat menyimpan. */
  signature?: string;
  submitLabel: string;
  successMessage: string;
}) {
  const reviewedLabel = article?.reviewedAt
    ? `Biarkan — sudah ditinjau ${article.reviewedAt.toLocaleDateString("id-ID")}`
    : "Biarkan — belum ditinjau";
  const expiryKeepLabel = article?.expiresAt
    ? `Biarkan — berlaku sampai ${article.expiresAt.toLocaleDateString("id-ID")}`
    : "Biarkan — tanpa masa berlaku";

  return (
    <form action={upsertHelpArticle.bind(null, article?.id ?? null)} className="flex flex-col gap-4">
      {signature && <input type="hidden" name="seenSignature" value={signature} />}
      <TextField name="title" label="Judul" required defaultValue={article?.title} />
      <SelectField
        name="section"
        label="Bagian"
        required
        defaultValue={article?.section}
        options={SECTIONS.map((s) => ({ value: s, label: s }))}
      />
      <MarkdownEditor
        name="content"
        label="Isi Panduan"
        defaultValue={article?.content ?? ""}
        rows={article ? 16 : 10}
        hint="Markdown ringan: # heading, daftar, tabel, code fence, penanda halaman [[p12]], dan {12}----- dari hasil ekstraksi PDF."
      />
      <ToggleSwitch
        name="isPublic"
        label="Tampilkan di halaman publik (/help)"
        hint="Nyalakan kalau panduan ini relevan buat anggota/pengguna umum, bukan cuma pengurus."
        defaultChecked={article?.isPublic}
      />

      <CollapsibleSection
        title="Guidebook Maba"
        description="Fase, urutan, dan status tinjauan. Cuma berpengaruh kalau fasenya diisi."
        defaultOpen={Boolean(article?.phase)}
      >
        <div className="flex flex-col gap-4">
          <SelectField
            name="phase"
            label="Fase"
            defaultValue={article?.phase ?? ""}
            options={PHASE_OPTIONS}
            hint="Isi = artikel ini jadi topik guidebook maba dan potongan pencariannya dibangun ulang saat disimpan."
          />
          <TextField
            name="sortOrder"
            type="number"
            label="Urutan dalam fase"
            defaultValue={article?.sortOrder ?? 0}
            hint="Angka kecil tampil lebih dulu."
          />
          <TextField
            name="sourceLabel"
            label="Sumber"
            defaultValue={article?.sourceLabel}
            hint="Contoh: Guide to 南京 2026 hal. 12-18, atau 'ditulis pengurus'."
          />
          <TextField
            name="sourceDocSlug"
            label="Slug dokumen sumber"
            defaultValue={article?.sourceDocSlug}
            hint="Nama file di dokumen sumber, buat menelusuri asalnya (opsional)."
          />
          <SelectField
            name="reviewState"
            label="Status tinjauan"
            defaultValue="keep"
            options={[
              { value: "keep", label: reviewedLabel },
              { value: "mark", label: "Tandai sudah ditinjau hari ini" },
              { value: "clear", label: "Batalkan tinjauan" },
            ]}
            hint="Isi visa dan izin tinggal wajib ditinjau orang yang tahu aturannya - tanggalnya yang bikin topik itu lolos dari panel diagnostik."
          />
          <SelectField
            name="expiresIn"
            label="Masa berlaku"
            defaultValue="keep"
            options={[{ value: "keep", label: expiryKeepLabel }, ...EXPIRY_OPTIONS.slice(1)]}
            hint="Aturan yang bisa berubah (imigrasi, KIP, bank) diberi masa berlaku; topik yang lewat tanggalnya masuk daftar tinjau ulang. Topik baru tanpa pilihan lain otomatis dapat 6 bulan - pilih 'Cabut masa berlaku' kalau memang tidak mau ada tanggal."
          />
        </div>
      </CollapsibleSection>

      <FormActions>
        <SubmitButton successMessage={successMessage} className={primaryBtn}>
          {submitLabel}
        </SubmitButton>
        <span className="text-xs text-on-surface-variant">
          Potongan pencarian dibangun ulang otomatis dari isi di atas.
        </span>
      </FormActions>
    </form>
  );
}
