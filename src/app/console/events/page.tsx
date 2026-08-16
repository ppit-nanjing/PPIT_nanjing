import { desc } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema";
import { createEvent } from "@/app/actions/admin-events";
import { DeleteEventButton } from "@/components/console/delete-event-button";
import { requireModuleAccess } from "@/lib/admin-scope";
import { ImageUploadCropper } from "@/components/upload/image-upload-cropper";
import { AIImproveButton } from "@/components/ai/ai-improve-button";
import { AIReviewButton } from "@/components/ai/ai-review-popup";
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
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <h1 className="text-headline-md sm:text-headline-lg text-on-background mb-8">Manajemen Kegiatan</h1>

      <details className="mb-8 bg-surface-container-lowest border border-outline-variant rounded-xl">
        <summary className="flex items-center gap-2 px-6 py-4 cursor-pointer text-label-caps text-primary-container uppercase tracking-wide">
          <Plus size={16} /> Buat Kegiatan Baru
        </summary>
        <form action={createEvent} className="px-6 pb-6 flex flex-col gap-4">
          <input id="event-title" name="title" placeholder="Judul Kegiatan *" required className="bg-soft-gray rounded-md p-3 text-body-md" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input id="event-category" name="category" placeholder="Kategori" className="bg-soft-gray rounded-md p-3 text-body-md" />
            <input id="event-location" name="location" placeholder="Lokasi" className="bg-soft-gray rounded-md p-3 text-body-md" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input name="startAt" type="datetime-local" className="bg-soft-gray rounded-md p-3 text-body-md" />
            <input name="capacity" type="number" min={1} placeholder="Kapasitas" className="bg-soft-gray rounded-md p-3 text-body-md" />
          </div>
          <label className="flex items-center gap-2 bg-soft-gray rounded-md p-3 text-body-md cursor-pointer">
            <input type="checkbox" name="requiresSensus" className="h-4 w-4 accent-[var(--color-primary-container)]" />
            Hanya untuk peserta yang sudah lengkap mengisi sensus (mahasiswa Indo di China)
          </label>
          <ImageUploadCropper
            name="coverImageUrl"
            folder="events"
            label="Gambar Sampul"
            placeholder="Tempel URL atau unggah gambar"
            aspect={16 / 9}
            allowPaste
          />
          <input name="registrationDeadline" type="datetime-local" placeholder="Batas Pendaftaran" className="bg-soft-gray rounded-md p-3 text-body-md" />
          <div>
            <textarea id="event-description" name="description" placeholder="Deskripsi" rows={3} className="bg-soft-gray rounded-md p-3 text-body-md resize-none w-full" />
            <AIImproveButton context="event" targetId="event-description" className="mt-1" />
          </div>
          <textarea
            id="event-agenda"
            name="agenda"
            placeholder={"Agenda/Jadwal (satu baris per item, contoh:\n18:00 - Registrasi\n19:00 - Pembukaan)"}
            rows={3}
            className="bg-soft-gray rounded-md p-3 text-body-md resize-none"
          />
          <AIReviewButton
            context="event"
            fields={[
              { id: "event-title", label: "Judul" },
              { id: "event-category", label: "Kategori" },
              { id: "event-location", label: "Lokasi" },
              { id: "event-description", label: "Deskripsi" },
              { id: "event-agenda", label: "Agenda" },
            ]}
          />
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
          <div
            key={e.id}
            className="flex items-center justify-between gap-4 bg-surface-container-lowest border border-outline-variant rounded-lg pl-5 pr-2 py-2 hover:bg-surface-container-low transition-colors"
          >
            <a
              href={`/console/events/${e.id}`}
              className="flex-1 flex items-center justify-between gap-4 py-2"
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
            <DeleteEventButton eventId={e.id} />
          </div>
        ))}
      </div>
    </div>
  );
}
