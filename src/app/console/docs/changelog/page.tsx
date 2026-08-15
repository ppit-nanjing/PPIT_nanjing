import { desc } from "drizzle-orm";
import { db } from "@/db";
import { releaseNotes } from "@/db/schema";
import { publishReleaseNote } from "@/app/actions/admin-docs";
import { Plus } from "lucide-react";

export default async function ChangelogPage() {
  const notes = await db.select().from(releaseNotes).orderBy(desc(releaseNotes.publishedAt));

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10 max-w-2xl">
      <h1 className="text-headline-md sm:text-headline-lg text-on-background mb-8">System Changelog</h1>

      <details className="mb-10 bg-surface-container-lowest border border-outline-variant rounded-xl">
        <summary className="flex items-center gap-2 px-6 py-4 cursor-pointer text-label-caps text-primary-container uppercase tracking-wide">
          <Plus size={16} /> Catat Rilis Baru
        </summary>
        <form action={publishReleaseNote} className="px-6 pb-6 flex flex-col gap-4">
          <input name="version" placeholder="Versi (mis. 1.1.0)" required className="bg-soft-gray rounded-md p-3 text-body-md" />
          <input name="summary" placeholder="Ringkasan singkat *" required className="bg-soft-gray rounded-md p-3 text-body-md" />
          <textarea name="details" placeholder="Detail (opsional)" rows={4} className="bg-soft-gray rounded-md p-3 text-body-md resize-none" />
          <button
            type="submit"
            className="self-start bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
          >
            Publikasikan
          </button>
        </form>
      </details>

      <div className="flex flex-col gap-6">
        {notes.length === 0 && <p className="text-body-md text-on-surface-variant">Belum ada rilis tercatat.</p>}
        {notes.map((n) => (
          <div key={n.id} className="border-l-2 border-primary-container pl-5">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-label-caps uppercase tracking-wide bg-primary-container/10 text-primary-container px-2 py-0.5 rounded">
                v{n.version}
              </span>
              <span className="text-label-caps text-on-surface-variant">
                {new Date(n.publishedAt).toLocaleDateString("id-ID")}
              </span>
            </div>
            <p className="text-body-md text-on-background font-medium">{n.summary}</p>
            {n.details && <p className="text-body-md text-on-surface-variant whitespace-pre-wrap mt-1">{n.details}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
