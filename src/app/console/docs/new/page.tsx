import { upsertHelpArticle } from "@/app/actions/admin-docs";

const SECTIONS = ["Pengguna", "Organisasi", "Kegiatan", "Inventaris", "Laporan"];

export default function NewHelpArticlePage() {
  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10 max-w-2xl">
      <h1 className="text-headline-md sm:text-headline-lg text-on-background mb-8">Tulis Panduan Baru</h1>
      <form action={upsertHelpArticle.bind(null, null)} className="flex flex-col gap-6">
        <label className="flex flex-col gap-2">
          <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Judul *</span>
          <input name="title" required className="bg-soft-gray rounded-md p-3 text-body-md" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Bagian *</span>
          <select name="section" required className="bg-soft-gray rounded-md p-3 text-body-md">
            {SECTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Isi Panduan</span>
          <textarea name="content" rows={10} className="bg-soft-gray rounded-md p-3 text-body-md resize-none" />
        </label>
        <button
          type="submit"
          className="self-start bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
        >
          Publikasikan
        </button>
      </form>
    </div>
  );
}
