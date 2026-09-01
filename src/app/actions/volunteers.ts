"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { eventCommittee, eventDivisions, eventVolunteers, events, users } from "@/db/schema";
import { requireModuleAccess } from "@/lib/admin-scope";
import { createTemplatedNotification } from "@/lib/notifications";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Melamar jadi volunteer - SATU-SATUNYA aksi publik di modul acara yang tidak
 * butuh akun, karena justru itu gunanya: kekurangan orang dikejar ke luar
 * PPIT. Diterima atau tidak tetap keputusan admin; di sini cuma mencatat.
 *
 * Tanpa pesan galat yang detail: email ganda / acara tutup cukup dialihkan
 * balik dengan penanda ?volunteer=sent agar form publik tidak bisa dipakai
 * mengintip status lamaran orang lain.
 */
export async function applyAsVolunteer(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const whatsapp = String(formData.get("whatsapp") ?? "").trim() || null;
  const divisionId = String(formData.get("divisionId") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!slug) redirect("/events");

  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  if (
    !event ||
    !event.volunteerSignupOpen ||
    event.status !== "published" ||
    !fullName ||
    !EMAIL_RE.test(email)
  ) {
    redirect(`/events/${slug}`);
  }

  // Yang sudah pegang peran panitia di acara ini tidak boleh melamar volunteer
  // lagi - lamarannya pasti duplikat dirinya sendiri dan cuma bikin antrean
  // approve admin kotor. Dicek dua jalur: sesi login yang sedang aktif, dan
  // email yang diketik (menangkap kasus orang mendaftar pakai email akunnya
  // yang sudah ditugaskan lewat Work Ledger). Dua-duanya dialihkan balik dengan
  // penanda ?volunteer=committee tanpa mengungkap detail apa pun ke pengunjung
  // lain - pesan lengkapnya hanya tampil bagi yang bersangkutan.
  const session = await auth();
  if (session?.user?.id) {
    const [mine] = await db
      .select({ id: eventCommittee.id })
      .from(eventCommittee)
      .where(and(eq(eventCommittee.eventId, eventId), eq(eventCommittee.userId, session.user.id)))
      .limit(1);
    if (mine) redirect(`/events/${slug}?volunteer=committee`);
  }
  const [byEmail] = await db
    .select({ id: eventCommittee.id })
    .from(eventCommittee)
    .innerJoin(users, eq(eventCommittee.userId, users.id))
    .where(and(eq(eventCommittee.eventId, eventId), eq(users.email, email)))
    .limit(1);
  if (byEmail) redirect(`/events/${slug}?volunteer=committee`);

  // Divisi pilihan harus memang milik acara ini; selain itu dibuang.
  let safeDivisionId: string | null = null;
  if (divisionId) {
    const [div] = await db
      .select({ id: eventDivisions.id })
      .from(eventDivisions)
      .where(and(eq(eventDivisions.id, divisionId), eq(eventDivisions.eventId, eventId)));
    safeDivisionId = div?.id ?? null;
  }

  await db
    .insert(eventVolunteers)
    .values({ eventId, fullName, email, whatsapp, divisionId: safeDivisionId, note })
    .onConflictDoNothing();

  redirect(`/events/${slug}?volunteer=sent`);
}

/**
 * Terima / tolak lamaran. Menerima berarti TIGA hal sekaligus: akun dibuatkan
 * bila belum ada (status "invited", persis pola undangan massal), penugasan
 * kepanitiaan ditulis ke divisi pilihannya, dan lamaran ditandai approved -
 * panitia tinggal memberi tahu orangnya bahwa akunnya menunggu diklaim.
 */
export async function setVolunteerStatus(formData: FormData): Promise<void> {
  await requireModuleAccess("events");
  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (!id || !["approved", "rejected"].includes(decision)) {
    throw new Error("Keputusan tidak valid");
  }

  const [app] = await db.select().from(eventVolunteers).where(eq(eventVolunteers.id, id));
  if (!app) throw new Error("Lamaran tidak ditemukan");

  if (decision === "rejected") {
    await db.update(eventVolunteers).set({ status: "rejected" }).where(eq(eventVolunteers.id, id));
    revalidatePath(`/console/events/${app.eventId}`);
    return;
  }

  // Akun sudah ada? Pakai. Belum? Buat baris invited - onConflictDoNothing
  // menangani balapan bila dua admin menerima bersamaan.
  let [account] = await db.select({ id: users.id }).from(users).where(eq(users.email, app.email));
  const accountExisted = !!account;
  if (!account) {
    [account] = await db
      .insert(users)
      .values({ email: app.email, name: app.fullName, status: "invited" as const })
      .onConflictDoNothing({ target: users.email })
      .returning({ id: users.id });
  }
  if (!account) throw new Error("Gagal menyiapkan akun volunteer");

  await db
    .insert(eventCommittee)
    .values({
      eventId: app.eventId,
      userId: account.id,
      divisionId: app.divisionId,
      role: "anggota",
      note: app.note,
    })
    .onConflictDoUpdate({
      target: [eventCommittee.eventId, eventCommittee.userId],
      set: { divisionId: app.divisionId },
    });

  await db
    .update(eventVolunteers)
    .set({ status: "approved", assignedUserId: account.id })
    .where(eq(eventVolunteers.id, id));

  // Anggota yang sudah pernah pakai portal diberi tahu lewat notifikasi in-app.
  // Yang akunnya baru dibuat (invited) belum pernah login - untuk mereka
  // pemberitahuannya jalur email undangan, bukan bell notifikasi.
  if (accountExisted) {
    try {
      const [event] = await db.select({ title: events.title }).from(events).where(eq(events.id, app.eventId));
      let divisionName = "";
      if (app.divisionId) {
        const [d] = await db.select({ name: eventDivisions.name }).from(eventDivisions).where(eq(eventDivisions.id, app.divisionId));
        if (d?.name) divisionName = ` ${d.name}`;
      }
      await createTemplatedNotification({
        userId: account.id,
        templateKey: "committee_assigned",
        variables: { eventTitle: event?.title ?? "kegiatan", roleLabel: "Anggota", divisionName },
        relatedEntityType: "event",
        relatedEntityId: app.eventId,
      });
    } catch (err) {
      console.error("[notify] volunteer committee_assigned failed:", err);
    }
  }

  revalidatePath(`/console/events/${app.eventId}`);
}
