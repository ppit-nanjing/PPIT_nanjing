import { desc } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema";
import { createEvent, setEventStatus } from "@/app/actions/admin-events";
import { publishDueEvents } from "@/lib/publish-events";
import { DeleteEventButton } from "@/components/console/delete-event-button";
import { requireModuleAccess } from "@/lib/admin-scope";
import { ImageUploadCropper } from "@/components/upload/image-upload-cropper";
import { AIImproveButton } from "@/components/ai/ai-improve-button";
import { AIReviewButton } from "@/components/ai/ai-review-popup";
import { CollapsibleSection } from "@/components/console/collapsible-section";
import { GuideButton } from "@/components/console/guide-button";
import { getGuide } from "@/lib/guides";
import { Plus } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draf",
  scheduled: "Terjadwal (belum rilis)",
  published: "Dipublikasikan",
  registration_closed: "Pendaftaran Ditutup",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

export default async function ConsoleEventsPage() {
  await requireModuleAccess("events");
  await publishDueEvents();
  const list = await db.select().from(events).orderBy(desc(events.startAt));
  const guide = await getGuide("kegiatan");

  return (
    <div className="px-3 py-4 sm:px-6 lg:px-8 lg:py-10">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4 sm:mb-6 lg:mb-8">
        <h1 className="text-headline-md sm:text-headline-lg text-on-background">Manajemen Kegiatan</h1>
        {guide && <GuideButton title={guide.title} content={guide.content} docSlug="kegiatan" />}
      </div>

      <details className="mb-6 sm:mb-8 bg-surface-container-lowest border border-outline-variant rounded-xl">
        <summary className="flex items-center gap-2 px-4 py-3 sm:px-6 sm:py-4 cursor-pointer text-label-caps text-primary-container uppercase tracking-wide">
          <Plus size={16} /> Buat Kegiatan Baru
        </summary>
        <form action={createEvent} className="px-4 pb-5 sm:px-6 sm:pb-6 flex flex-col gap-3 sm:gap-4">
          <input id="event-title" name="title" placeholder="Judul Kegiatan *" required className="bg-soft-gray rounded-md p-2.5 sm:p-3 text-body-md" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <input id="event-category" name="category" placeholder="Kategori" className="bg-soft-gray rounded-md p-2.5 sm:p-3 text-body-md" />
            <input id="event-location" name="location" placeholder="Lokasi" className="bg-soft-gray rounded-md p-2.5 sm:p-3 text-body-md" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="flex flex-col gap-1">
              <input name="startAt" type="datetime-local" className="bg-soft-gray rounded-md p-2.5 sm:p-3 text-body-md" />
              <p className="text-xs text-on-surface-variant">Kapan acara berlangsung (tanggal & jam mulai).</p>
            </div>
            <input name="capacity" type="number" min={1} placeholder="Kapasitas" className="bg-soft-gray rounded-md p-2.5 sm:p-3 text-body-md" />
          </div>
          <label className="flex items-center gap-2 bg-soft-gray rounded-md p-2.5 sm:p-3 text-body-md cursor-pointer">
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
          <div className="flex flex-col gap-1">
            <input name="registrationDeadline" type="datetime-local" placeholder="Batas Pendaftaran" className="bg-soft-gray rounded-md p-2.5 sm:p-3 text-body-md" />
            <p className="text-xs text-on-surface-variant">Batas waktu peserta boleh mendaftar. Lewat dari ini tombol daftar tertutup otomatis. Kosongkan bila tak ada batas.</p>
          </div>
          <div className="flex flex-col gap-1">
            <input name="scheduledPublishAt" type="datetime-local" placeholder="Jadwal Rilis Publikasi (opsional)" className="bg-soft-gray rounded-md p-2.5 sm:p-3 text-body-md" />
            <p className="text-xs text-on-surface-variant">Isi bila acara mau tampil ke publik hanya SETELAH tanggal/waktu ini (status &quot;Terjadwal&quot; dulu, rilis sendiri nanti). Kosongkan = langsung Draf, rilis saat kamu klik Publish manual.</p>
          </div>
          <div>
            <textarea id="event-description" name="description" placeholder="Deskripsi" rows={3} className="bg-soft-gray rounded-md p-2.5 sm:p-3 text-body-md resize-none w-full" />
            <AIImproveButton context="event" targetId="event-description" className="mt-1" />
          </div>
          <textarea
            id="event-agenda"
            name="agenda"
            placeholder={"Agenda/Jadwal (satu baris per item, contoh:\n18:00 - Registrasi\n19:00 - Pembukaan)"}
            rows={3}
            className="bg-soft-gray rounded-md p-2.5 sm:p-3 text-body-md resize-none"
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
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              name="intent"
              value="schedule"
              className="self-start bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-4 py-2.5 sm:px-6 sm:py-3 rounded-md hover:bg-primary transition-colors"
            >
              Buat &amp; Lanjut Edit
            </button>
            <button
              type="submit"
              name="intent"
              value="draft"
              className="self-start bg-surface-container-low text-on-background text-label-caps uppercase tracking-wide px-4 py-2.5 sm:px-6 sm:py-3 rounded-md border border-outline-variant hover:bg-surface-container transition-colors"
            >
              Simpan sebagai Draft
            </button>
          </div>
        </form>
      </details>

      <CollapsibleSection title="Daftar Kegiatan" description="Semua kegiatan yang dibuat.">
        <div className="flex flex-col gap-2">
          {list.length === 0 && <p className="text-body-md text-on-surface-variant">Belum ada kegiatan dibuat.</p>}
          {list.map((e) => (
            <div
              key={e.id}
              className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between bg-surface-container-lowest border border-outline-variant rounded-lg pl-4 pr-2 py-2 hover:bg-surface-container-low transition-colors"
            >
              <a
                href={`/console/events/${e.id}`}
                className="w-full sm:flex-1 sm:min-w-0 flex items-center justify-between gap-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-body-md font-medium text-on-background truncate">{e.title}</p>
                  <p className="text-label-caps text-on-surface-variant">
                    {e.startAt ? new Date(e.startAt).toLocaleDateString("id-ID") : "Belum dijadwalkan"}
                  </p>
                </div>
                <span className="text-label-caps uppercase tracking-wide bg-surface-container-low px-2.5 py-1 rounded shrink-0">
                  {STATUS_LABEL[e.status]}
                </span>
              </a>
              <div className="self-end sm:self-auto flex items-center gap-2 sm:shrink-0">
                 {e.status !== "draft" && (
                   <form action={setEventStatus}>
                     <input type="hidden" name="eventId" value={e.id} />
                     <input type="hidden" name="status" value="draft" />
                     <button
                       type="submit"
                       className="text-label-caps uppercase tracking-wide px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-md border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-colors"
                     >
                       Jadikan Draft
                     </button>
                   </form>
                 )}
                <DeleteEventButton eventId={e.id} />
              </div>
            </div>
          ))}
        </div>
      </CollapsibleSection>
    </div>
  );
}
