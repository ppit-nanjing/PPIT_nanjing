import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { events, eventRegistrations, users } from "@/db/schema";
import { updateEvent } from "@/app/actions/admin-events";
import { RegistrationList } from "@/components/console/registration-list";
import { requireModuleAccess } from "@/lib/admin-scope";

export default async function ConsoleEventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireModuleAccess("events");
  const { id } = await params;
  const [event] = await db.select().from(events).where(eq(events.id, id));
  if (!event) notFound();

  const registrations = await db
    .select({ reg: eventRegistrations, userName: users.name, userEmail: users.email })
    .from(eventRegistrations)
    .leftJoin(users, eq(eventRegistrations.userId, users.id))
    .where(eq(eventRegistrations.eventId, id))
    .orderBy(desc(eventRegistrations.registeredAt));

  const attended = registrations.filter((r) => r.reg.status === "attended").length;

  return (
    <div className="px-8 py-10 max-w-3xl">
      <h1 className="text-headline-lg text-on-background mb-2">{event.title}</h1>
      <p className="text-body-md text-on-surface-variant mb-8">
        {registrations.length} terdaftar &middot; {attended} hadir
        {event.capacity ? ` &middot; kapasitas ${event.capacity}` : ""}
      </p>

      <details className="mb-10 bg-surface-container-lowest border border-outline-variant rounded-xl">
        <summary className="px-6 py-4 cursor-pointer text-label-caps text-primary-container uppercase tracking-wide">
          Edit Detail Kegiatan
        </summary>
        <form action={updateEvent.bind(null, id)} className="px-6 pb-6 flex flex-col gap-4">
          <input name="title" defaultValue={event.title} required className="bg-soft-gray rounded-md p-3 text-body-md" />
          <div className="grid grid-cols-2 gap-4">
            <input name="category" defaultValue={event.category ?? ""} placeholder="Kategori" className="bg-soft-gray rounded-md p-3 text-body-md" />
            <input name="location" defaultValue={event.location ?? ""} placeholder="Lokasi" className="bg-soft-gray rounded-md p-3 text-body-md" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input
              name="startAt"
              type="datetime-local"
              defaultValue={event.startAt ? new Date(event.startAt).toISOString().slice(0, 16) : ""}
              className="bg-soft-gray rounded-md p-3 text-body-md"
            />
            <input name="capacity" type="number" min={1} defaultValue={event.capacity ?? ""} placeholder="Kapasitas" className="bg-soft-gray rounded-md p-3 text-body-md" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input
              name="coverImageUrl"
              type="url"
              defaultValue={event.coverImageUrl ?? ""}
              placeholder="URL Gambar Sampul"
              className="bg-soft-gray rounded-md p-3 text-body-md"
            />
            <input
              name="registrationDeadline"
              type="datetime-local"
              defaultValue={event.registrationDeadline ? new Date(event.registrationDeadline).toISOString().slice(0, 16) : ""}
              placeholder="Batas Pendaftaran"
              className="bg-soft-gray rounded-md p-3 text-body-md"
            />
          </div>
          <textarea name="description" defaultValue={event.description ?? ""} rows={3} className="bg-soft-gray rounded-md p-3 text-body-md resize-none" />
          <textarea
            name="agenda"
            defaultValue={event.agenda ?? ""}
            placeholder={"Agenda/Jadwal (satu baris per item, contoh:\n18:00 - Registrasi\n19:00 - Pembukaan)"}
            rows={3}
            className="bg-soft-gray rounded-md p-3 text-body-md resize-none"
          />
          <select name="status" defaultValue={event.status} className="bg-soft-gray rounded-md p-3 text-body-md">
            <option value="draft">Draf</option>
            <option value="published">Dipublikasikan</option>
            <option value="registration_closed">Pendaftaran Ditutup</option>
            <option value="completed">Selesai</option>
            <option value="cancelled">Dibatalkan</option>
          </select>
          <button
            type="submit"
            className="self-start bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
          >
            Simpan Perubahan
          </button>
        </form>
      </details>

      <h2 className="text-headline-md text-on-background mb-4">Daftar Pendaftar</h2>
      <RegistrationList
        eventId={id}
        registrations={registrations.map((r) => ({
          id: r.reg.id,
          userName: r.userName,
          userEmail: r.userEmail,
          status: r.reg.status,
          registeredAt: r.reg.registeredAt.toISOString(),
        }))}
      />
    </div>
  );
}
