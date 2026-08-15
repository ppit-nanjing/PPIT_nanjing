import { desc } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema";
import { createEvent } from "@/app/actions/admin-events";
import { requireModuleAccess } from "@/lib/admin-scope";
import { Plus } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draf",
  published: "Dipublikasikan",
  registration_closed: "Pendaftaran Ditutup",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

export default async function ConsoleEventsPage() {
  await requireModuleAccess("events");
  const list = await db.select().from(events).orderBy(desc(events.startAt));

  return (
    <div className="px-8 py-10">
      <h1 className="text-headline-lg text-on-background mb-8">Manajemen Kegiatan</h1>

      <details className="mb-8 bg-surface-container-lowest border border-outline-variant rounded-xl">
        <summary className="flex items-center gap-2 px-6 py-4 cursor-pointer text-label-caps text-primary-container uppercase tracking-wide">
          <Plus size={16} /> Buat Kegiatan Baru
        </summary>
        <form action={createEvent} className="px-6 pb-6 flex flex-col gap-4">
          <input name="title" placeholder="Judul Kegiatan *" required className="bg-soft-gray rounded-md p-3 text-body-md" />
          <div className="grid grid-cols-2 gap-4">
            <input name="category" placeholder="Kategori" className="bg-soft-gray rounded-md p-3 text-body-md" />
            <input name="location" placeholder="Lokasi" className="bg-soft-gray rounded-md p-3 text-body-md" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input name="startAt" type="datetime-local" className="bg-soft-gray rounded-md p-3 text-body-md" />
            <input name="capacity" type="number" min={1} placeholder="Kapasitas" className="bg-soft-gray rounded-md p-3 text-body-md" />
          </div>
          <textarea name="description" placeholder="Deskripsi" rows={3} className="bg-soft-gray rounded-md p-3 text-body-md resize-none" />
          <button
            type="submit"
            className="self-start bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
          >
            Buat &amp; Lanjut Edit
          </button>
        </form>
      </details>

      <div className="flex flex-col gap-2">
        {list.length === 0 && <p className="text-body-md text-on-surface-variant">Belum ada kegiatan dibuat.</p>}
        {list.map((e) => (
          <a
            key={e.id}
            href={`/console/events/${e.id}`}
            className="flex items-center justify-between gap-4 bg-surface-container-lowest border border-outline-variant rounded-lg px-5 py-4 hover:bg-surface-container-low transition-colors"
          >
            <div>
              <p className="text-body-md font-medium text-on-background">{e.title}</p>
              <p className="text-label-caps text-on-surface-variant">
                {e.startAt ? new Date(e.startAt).toLocaleDateString("id-ID") : "Belum dijadwalkan"}
              </p>
            </div>
            <span className="text-label-caps uppercase tracking-wide bg-surface-container-low px-2.5 py-1 rounded shrink-0">
              {STATUS_LABEL[e.status]}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
