import { and, eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { certificates, events, eventRegistrations, sensusProfiles, users } from "@/db/schema";
import { MEMBERSHIP_LABEL, effectiveBranch, membershipStatus } from "@/lib/membership-status";
import { updateEvent } from "@/app/actions/admin-events";
import { publishDueEvents } from "@/lib/publish-events";
import { DeleteEventButton } from "@/components/console/delete-event-button";
import { RegistrationList } from "@/components/console/registration-list";
import { EventCommitteeStructure } from "@/components/console/event-committee-structure";
import { listEventDivisions } from "@/app/actions/committee";
import { requireModuleAccess } from "@/lib/admin-scope";
import { ImageUploadCropper } from "@/components/upload/image-upload-cropper";
import { AIImproveButton } from "@/components/ai/ai-improve-button";
import { AIReviewButton } from "@/components/ai/ai-review-popup";
import { CollapsibleSection } from "@/components/console/collapsible-section";

export default async function ConsoleEventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireModuleAccess("events");
  const { id } = await params;
  await publishDueEvents();
  const [event] = await db.select().from(events).where(eq(events.id, id));
  if (!event) notFound();

  const registrations = await db
    .select({
      reg: eventRegistrations,
      userName: users.name,
      userEmail: users.email,
      // Sensus di-join supaya roster bisa menjawab "siapa saja yang hadir":
      // anggota Nanjing, mahasiswa dari cabang lain, atau tamu luar.
      sensusBranch: sensusProfiles.branch,
      sensusCompletion: sensusProfiles.completionStatus,
    })
    .from(eventRegistrations)
    .leftJoin(users, eq(eventRegistrations.userId, users.id))
    .leftJoin(sensusProfiles, eq(sensusProfiles.userId, eventRegistrations.userId))
    .where(eq(eventRegistrations.eventId, id))
    .orderBy(desc(eventRegistrations.registeredAt));

  // Struktur kepanitiaan acara ini (Departemen -> sub-tim) + daftar orang yang
  // bisa ditugaskan. Kandidatnya SEMUA akun, bukan cuma anggota departemen:
  // kepanitiaan acara memang tidak terikat jabatan struktural.
  const { divisions, members: committee } = await listEventDivisions(id);
  const candidates = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .orderBy(users.name);
  const issuedCerts = await db
    .select({ userId: certificates.userId })
    .from(certificates)
    .where(and(eq(certificates.eventId, id), eq(certificates.kind, "panitia")));

  const attended = registrations.filter((r) => r.reg.status === "attended").length;

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10 max-w-3xl">
      <h1 className="text-headline-md sm:text-headline-lg text-on-background mb-2">{event.title}</h1>
      <p className="text-body-md text-on-surface-variant mb-8">
        {registrations.length} terdaftar &middot; {attended} hadir
        {event.capacity ? ` &middot; kapasitas ${event.capacity}` : ""}
      </p>

      <details className="mb-10 bg-surface-container-lowest border border-outline-variant rounded-xl">
        <summary className="px-6 py-4 cursor-pointer text-label-caps text-primary-container uppercase tracking-wide">
          Edit Detail Kegiatan
        </summary>
        <form action={updateEvent.bind(null, id)} className="px-6 pb-6 flex flex-col gap-4">
          <input id="event-title" name="title" defaultValue={event.title} required className="bg-soft-gray rounded-md p-3 text-body-md" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input id="event-category" name="category" defaultValue={event.category ?? ""} placeholder="Kategori" className="bg-soft-gray rounded-md p-3 text-body-md" />
            <input id="event-location" name="location" defaultValue={event.location ?? ""} placeholder="Lokasi" className="bg-soft-gray rounded-md p-3 text-body-md" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <input
                name="startAt"
                type="datetime-local"
                defaultValue={event.startAt ? new Date(event.startAt).toISOString().slice(0, 16) : ""}
                className="bg-soft-gray rounded-md p-3 text-body-md"
              />
              <p className="text-xs text-on-surface-variant">Kapan acara berlangsung (tanggal & jam mulai).</p>
            </div>
              <input name="capacity" type="number" min={1} defaultValue={event.capacity ?? ""} placeholder="Kapasitas" className="bg-soft-gray rounded-md p-3 text-body-md" />
            </div>
            <label className="flex items-center gap-2 bg-soft-gray rounded-md p-3 text-body-md cursor-pointer">
              <input type="checkbox" name="requiresSensus" defaultChecked={event.requiresSensus} className="h-4 w-4 accent-[var(--color-primary-container)]" />
              Hanya untuk peserta yang sudah lengkap mengisi sensus (mahasiswa Indo di China)
            </label>
          <ImageUploadCropper
            name="coverImageUrl"
            folder="events"
            label="Gambar Sampul"
            placeholder="Tempel URL atau unggah gambar"
            defaultValue={event.coverImageUrl ?? ""}
            aspect={16 / 9}
            allowPaste
          />
          <div className="flex flex-col gap-1">
            <input
              name="registrationDeadline"
              type="datetime-local"
              defaultValue={event.registrationDeadline ? new Date(event.registrationDeadline).toISOString().slice(0, 16) : ""}
              placeholder="Batas Pendaftaran"
              className="bg-soft-gray rounded-md p-3 text-body-md"
            />
            <p className="text-xs text-on-surface-variant">Batas waktu peserta boleh mendaftar. Lewat dari ini tombol daftar tertutup otomatis. Kosongkan bila tak ada batas.</p>
          </div>
          <div className="flex flex-col gap-1">
            <input
              name="scheduledPublishAt"
              type="datetime-local"
              defaultValue={event.scheduledPublishAt ? new Date(event.scheduledPublishAt).toISOString().slice(0, 16) : ""}
              placeholder="Jadwal Rilis Publikasi (opsional)"
              className="bg-soft-gray rounded-md p-3 text-body-md"
            />
            <p className="text-xs text-on-surface-variant">Isi bila acara mau tampil ke publik hanya SETELAH tanggal/waktu ini (status &quot;Terjadwal&quot; dulu, rilis sendiri nanti). Kosongkan = langsung Draf, rilis saat kamu klik Publish manual.</p>
          </div>
          <div>
            <textarea id="event-description" name="description" defaultValue={event.description ?? ""} rows={3} className="bg-soft-gray rounded-md p-3 text-body-md resize-none w-full" />
            <AIImproveButton context="event" targetId="event-description" className="mt-1" />
          </div>
          <textarea
            id="event-agenda"
            name="agenda"
            defaultValue={event.agenda ?? ""}
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
          <select name="statusSelect" defaultValue={event.status} className="bg-soft-gray rounded-md p-3 text-body-md">
            <option value="draft">Draf</option>
            <option value="scheduled">Terjadwal (belum rilis)</option>
            <option value="published">Dipublikasikan</option>
            <option value="registration_closed">Pendaftaran Ditutup</option>
            <option value="completed">Selesai</option>
            <option value="cancelled">Dibatalkan</option>
          </select>
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              name="status"
              value="draft"
              className="self-start bg-surface-container-low text-on-background text-label-caps uppercase tracking-wide px-6 py-3 rounded-md border border-outline-variant hover:bg-surface-container transition-colors"
            >
              Simpan sebagai Draft
            </button>
            <button
              type="submit"
              name="status"
              value="published"
              className="self-start bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
            >
              Publikasikan
            </button>
            <button
              type="submit"
              className="self-start bg-surface-container-low text-on-background text-label-caps uppercase tracking-wide px-6 py-3 rounded-md border border-outline-variant hover:bg-surface-container transition-colors"
            >
              Simpan Perubahan
            </button>
          </div>
        </form>
      </details>

      <CollapsibleSection
        title="Struktur Kepanitiaan"
        description={`${divisions.length} divisi · ${committee.length} panitia`}
      >
        <EventCommitteeStructure
          eventId={id}
          divisions={divisions}
          members={committee}
          candidates={candidates}
          certifiedUserIds={issuedCerts.map((c) => c.userId)}
        />
      </CollapsibleSection>

      <CollapsibleSection title="Daftar Pendaftar" description={`${registrations.length} terdaftar · ${attended} hadir`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div className="flex items-center gap-3">
            <a
              href={`/console/events/${id}/scan`}
              className="inline-flex items-center gap-2 border border-outline-variant text-on-background text-label-caps uppercase tracking-wide px-4 py-2 rounded-md hover:bg-surface-container-low transition-colors"
            >
              Buka Scanner Check-in
            </a>
            <DeleteEventButton eventId={id} label="Hapus Kegiatan" />
          </div>
        </div>
        <RegistrationList
          eventId={id}
          registrations={registrations.map((r) => ({
            id: r.reg.id,
            userName: r.userName,
            userEmail: r.userEmail,
            status: r.reg.status,
            registeredAt: r.reg.registeredAt.toISOString(),
            membership: MEMBERSHIP_LABEL[
              membershipStatus(
                r.sensusCompletion ? { branch: r.sensusBranch, completionStatus: r.sensusCompletion } : null
              )
            ],
            // Sensus lengkap lebih berwenang daripada jawaban sekali-pakai di
            // form pendaftaran; null = pendaftaran lama, sebelum pertanyaannya ada.
            branch: effectiveBranch(r.sensusCompletion === "complete" ? r.sensusBranch : null, r.reg.branch),
          }))}
        />
      </CollapsibleSection>
    </div>
  );
}
