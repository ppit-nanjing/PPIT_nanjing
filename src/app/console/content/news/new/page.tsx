import { requireModuleAccess } from "@/lib/admin-scope";
import { upsertNewsArticle } from "@/app/actions/admin-content";
import { FileUpload } from "@/components/upload/file-upload";
import { AIImproveButton } from "@/components/ai/ai-improve-button";

export default async function NewNewsArticlePage() {
  await requireModuleAccess("content");

  return (
    <div className="px-8 py-10 max-w-2xl">
      <h1 className="text-headline-lg text-on-background mb-8">Tulis Berita Baru</h1>
      <form action={upsertNewsArticle.bind(null, null)} className="flex flex-col gap-6">
        <input name="title" placeholder="Judul *" required className="bg-soft-gray rounded-md p-3 text-body-md" />
          <div className="grid grid-cols-2 gap-4">
            <FileUpload name="coverImageUrl" folder="news" label="Foto Sampul (opsional)" placeholder="URL atau unggah gambar" />
            <input name="category" placeholder="Kategori (opsional)" className="bg-soft-gray rounded-md p-3 text-body-md" />
          </div>
        <div>
          <textarea id="news-content" name="content" placeholder="Isi berita" rows={10} className="bg-soft-gray rounded-md p-3 text-body-md resize-none w-full" />
          <AIImproveButton context="news" targetId="news-content" className="mt-1" />
        </div>
        <label className="flex items-center gap-2 text-body-md text-on-background">
          <input type="checkbox" name="publish" className="w-4 h-4" />
          Publikasikan sekarang (jika tidak dicentang, tersimpan sebagai draf)
        </label>
        <button
          type="submit"
          className="self-start bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
        >
          Simpan
        </button>
      </form>
    </div>
  );
}
