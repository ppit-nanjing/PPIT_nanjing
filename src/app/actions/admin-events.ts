"use server";

import { eq, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { events, eventRegistrations, eventQuestions, eventCommittee, galleryAlbums } from "@/db/schema";
import { hasModuleAccess } from "@/lib/admin-scope";
import { createTemplatedNotification } from "@/lib/notifications";
import { issueParticipantCertificatesCore } from "@/app/actions/committee";

async function requireAdmin() {
  const session = await auth();
  if (!hasModuleAccess(session?.user?.adminScope ?? null, "events")) throw new Error("Forbidden");
  return session!.user.id;
}

function slugify(title: string) {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") +
    "-" +
    Math.random().toString(36).slice(2, 6)
  );
}

// Shared by createEvent/updateEvent so the two forms can't drift on what
// counts as a valid fee. Blank = amount not decided yet (fine, isPaid can
// still be true); anything present must be a non-negative whole number.
function parseFeeCny(formData: FormData): number | null {
  const raw = String(formData.get("feeCny") ?? "").trim();
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error("Biaya harus berupa angka >= 0");
  return Math.round(parsed);
}

// Inline-validation shape shared by console event forms - mirrors
// ShortLinkFormState in short-links.ts.
export type EventFormState = { error?: string };

export async function createEvent(_prev: EventFormState, formData: FormData): Promise<EventFormState> {
  const actorId = await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Judul wajib diisi." };
  // Same fee rule as updateEvent's parseFeeCny, but returned inline instead of
  // thrown - a thrown Error here would wipe everything the admin just typed.
  const rawFee = String(formData.get("feeCny") ?? "").trim();
  if (rawFee && (!Number.isFinite(Number(rawFee)) || Number(rawFee) < 0)) {
    return { error: "Biaya harus berupa angka >= 0" };
  }

  const scheduledPublishAt = formData.get("scheduledPublishAt")
    ? new Date(String(formData.get("scheduledPublishAt")))
    : null;
  // "intent=draft" forces a plain draft even when a publish schedule is set;
  // otherwise a set schedule keeps the event in 'scheduled' (hidden) state.
  const intent = String(formData.get("intent") ?? "schedule");
  const status: (typeof events.status.enumValues)[number] =
    intent === "draft" ? "draft" : scheduledPublishAt ? "scheduled" : "draft";

  const [created] = await db
    .insert(events)
    .values({
      title,
      slug: slugify(title),
      description: String(formData.get("description") ?? "").trim() || null,
      category: String(formData.get("category") ?? "").trim() || null,
      location: String(formData.get("location") ?? "").trim() || null,
      coverImageUrl: String(formData.get("coverImageUrl") ?? "").trim() || null,
      startAt: formData.get("startAt") ? new Date(String(formData.get("startAt"))) : null,
      registrationDeadline: formData.get("registrationDeadline")
        ? new Date(String(formData.get("registrationDeadline")))
        : null,
      capacity: formData.get("capacity") ? Number(formData.get("capacity")) : null,
      requiresSensus: formData.get("requiresSensus") === "on",
      agenda: String(formData.get("agenda") ?? "").trim() || null,
      status,
      scheduledPublishAt,
      createdBy: actorId,
      isPaid: formData.get("isPaid") === "on",
      feeCny: parseFeeCny(formData),
      paymentInstructions: String(formData.get("paymentInstructions") ?? "").trim() || null,
      paymentQrUrl: String(formData.get("paymentQrUrl") ?? "").trim() || null,
      alipayUid: String(formData.get("alipayUid") ?? "").trim() || null,
      certificateForParticipants: formData.get("certificateForParticipants") === "on",
      volunteerSignupOpen: formData.get("volunteerSignupOpen") === "on",
    })
    .returning();

  redirect(`/console/events/${created.id}`);
}

export async function updateEvent(id: string, formData: FormData) {
  const actorId = await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Judul wajib diisi");

  const scheduledPublishAt = formData.get("scheduledPublishAt")
    ? new Date(String(formData.get("scheduledPublishAt")))
    : null;
  // A quick button (name="status") overrides the status <select> (name="statusSelect").
  const quickStatus = formData.get("status") as string | null;
  let status = (quickStatus ?? formData.get("statusSelect") ?? "draft") as (typeof events.status.enumValues)[number];
  // If a publish schedule is set but the admin left it as a draft, move it to
  // the 'scheduled' state so it auto-publishes when the time arrives.
  if (scheduledPublishAt && status === "draft") status = "scheduled";

  const [before] = await db.select({ status: events.status }).from(events).where(eq(events.id, id));

  const isPaid = formData.get("isPaid") === "on";

  await db
    .update(events)
    .set({
      title,
      description: String(formData.get("description") ?? "").trim() || null,
      category: String(formData.get("category") ?? "").trim() || null,
      location: String(formData.get("location") ?? "").trim() || null,
      coverImageUrl: String(formData.get("coverImageUrl") ?? "").trim() || null,
      startAt: formData.get("startAt") ? new Date(String(formData.get("startAt"))) : null,
      registrationDeadline: formData.get("registrationDeadline")
        ? new Date(String(formData.get("registrationDeadline")))
        : null,
      capacity: formData.get("capacity") ? Number(formData.get("capacity")) : null,
      requiresSensus: formData.get("requiresSensus") === "on",
      agenda: String(formData.get("agenda") ?? "").trim() || null,
      status,
      scheduledPublishAt,
      isPaid,
      feeCny: parseFeeCny(formData),
      paymentInstructions: String(formData.get("paymentInstructions") ?? "").trim() || null,
      paymentQrUrl: String(formData.get("paymentQrUrl") ?? "").trim() || null,
      alipayUid: String(formData.get("alipayUid") ?? "").trim() || null,
      certificateForParticipants: formData.get("certificateForParticipants") === "on",
      volunteerSignupOpen: formData.get("volunteerSignupOpen") === "on",
    })
    .where(eq(events.id, id));

  // An event can go free -> paid after people already registered (fee often
  // isn't known until a sponsor is confirmed). Anyone still "not_required"
  // now owes money and needs to show up in the verification queue - without
  // this they'd stay invisible forever. Only widens tracking, never narrows
  // it: turning HTM back off does NOT revert anyone already "unpaid"/etc.
  if (isPaid) {
    await db
      .update(eventRegistrations)
      .set({ paymentStatus: "unpaid" })
      .where(and(eq(eventRegistrations.eventId, id), eq(eventRegistrations.paymentStatus, "not_required")));
  }

  // E-sertifikat peserta otomatis: begitu acara PERTAMA kali ditandai
  // "Selesai", semua pendaftar yang diterima langsung kebagian sertifikat
  // (bila checkbox-nya menyala). Idempoten - menjalankan ulang tidak
  // menggandakan; tombol manual tetap ada untuk pendaftar belakangan.
  if (status === "completed" && before?.status !== "completed") {
    await issueParticipantCertificatesCore(id, actorId);
    revalidatePath("/console/work-ledger");
  }

  revalidatePath(`/console/events/${id}`);
}

// Quick status change from the event list (e.g. a "Jadikan Draft" button).
// Accepts FormData so it can be wired directly to a <form action> without .bind().
export async function setEventStatus(formData: FormData) {
  const id = String(formData.get("eventId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !status) throw new Error("eventId dan status wajib diisi");
  const actorId = await requireAdmin();
  const [before] = await db.select({ status: events.status }).from(events).where(eq(events.id, id));
  await db
    .update(events)
    .set({ status: status as (typeof events.status.enumValues)[number] })
    .where(eq(events.id, id));
  // Sama seperti updateEvent: selesai = sertifikat peserta keluar otomatis.
  if (status === "completed" && before?.status !== "completed") {
    await issueParticipantCertificatesCore(id, actorId);
    revalidatePath("/console/work-ledger");
  }
  revalidatePath("/console/events");
}

// ---------- Pertanyaan pendaftaran kustom per-acara ----------

const QUESTION_TYPES = ["text", "textarea", "select", "radio", "multiselect"] as const;

function parseQuestionOptions(formData: FormData, type: string): string | null {
  const raw = String(formData.get("options") ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n");
  // Pilihan tanpa opsi = pertanyaan yang tidak bisa dijawab - tolak di sini,
  // bukan saat peserta kebingungan menghadapi dropdown kosong.
  if ((type === "select" || type === "radio" || type === "multiselect") && !raw) {
    throw new Error("Tipe pilihan butuh minimal satu opsi (satu per baris)");
  }
  return raw || null;
}

/** Tambah / ubah satu pertanyaan. Ada `id` = ubah; tanpa `id` = tambah di urutan terakhir. */
export async function saveEventQuestion(formData: FormData) {
  await requireAdmin();
  const eventId = String(formData.get("eventId") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const type = String(formData.get("type") ?? "text");
  if (!eventId || !label) throw new Error("Acara dan label pertanyaan wajib diisi");
  if (!QUESTION_TYPES.includes(type as (typeof QUESTION_TYPES)[number])) {
    throw new Error("Tipe pertanyaan tidak valid");
  }
  const values = {
    eventId,
    label,
    type: type as (typeof QUESTION_TYPES)[number],
    options: parseQuestionOptions(formData, type),
    required: formData.get("required") === "on",
  };

  const id = String(formData.get("id") ?? "").trim();
  if (id) {
    await db.update(eventQuestions).set(values).where(eq(eventQuestions.id, id));
  } else {
    const [{ maxOrder }] = await db
      .select({ maxOrder: sql`coalesce(max(${eventQuestions.orderIndex}), 0)` })
      .from(eventQuestions)
      .where(eq(eventQuestions.eventId, eventId));
    await db.insert(eventQuestions).values({ ...values, orderIndex: Number(maxOrder) + 1 });
  }
  revalidatePath(`/console/events/${eventId}`);
}

export async function deleteEventQuestion(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const [row] = await db
    .select({ eventId: eventQuestions.eventId })
    .from(eventQuestions)
    .where(eq(eventQuestions.id, id));
  await db.delete(eventQuestions).where(eq(eventQuestions.id, id));
  if (row) revalidatePath(`/console/events/${row.eventId}`);
}

export async function checkInRegistration(registrationId: string, eventId: string) {
  await requireAdmin();
  const [registration] = await db
    .select({ userId: eventRegistrations.userId })
    .from(eventRegistrations)
    .where(eq(eventRegistrations.id, registrationId));
  const [event] = await db.select({ title: events.title }).from(events).where(eq(events.id, eventId));

  await db
    .update(eventRegistrations)
    .set({ status: "attended", checkedInAt: new Date() })
    .where(eq(eventRegistrations.id, registrationId));

  if (registration?.userId) {
    await createTemplatedNotification({
      userId: registration.userId,
      templateKey: "event_checkin",
      variables: { eventTitle: event?.title ?? "acara" },
      relatedEntityType: "event_registration",
      relatedEntityId: registrationId,
    });
  }

  revalidatePath(`/console/events/${eventId}`);
}

// Check-in by the QR token scanned from a ticket. Separated from the scan page
// render so the db write happens in a server action (triggered client-side
// after the page loads) rather than during the Server Component render - doing
// a mutation inside a render breaks RSC streaming in production.
export async function checkInByToken(token: string, eventId: string) {
  await requireAdmin();

  const [registration] = await db
    .select({ id: eventRegistrations.id, userId: eventRegistrations.userId, status: eventRegistrations.status })
    .from(eventRegistrations)
    .where(and(eq(eventRegistrations.qrCodeToken, token), eq(eventRegistrations.eventId, eventId)));

  if (!registration) return { ok: false as const };

  if (registration.status === "attended") {
    return { ok: true as const, already: true as const };
  }

  await db
    .update(eventRegistrations)
    .set({ status: "attended", checkedInAt: new Date() })
    .where(eq(eventRegistrations.id, registration.id));

  const [event] = await db.select({ title: events.title }).from(events).where(eq(events.id, eventId));
  if (registration.userId) {
    await createTemplatedNotification({
      userId: registration.userId,
      templateKey: "event_checkin",
      variables: { eventTitle: event?.title ?? "acara" },
      relatedEntityType: "event_registration",
      relatedEntityId: registration.id,
    });
  }

  return { ok: true as const, already: false as const };
}

// Check-in PANITIA lewat QR tiket kepanitiaan (token di event_committee.
// attendance_token, dibuat lazily oleh halaman /events/[slug]/committee).
// Pola persis checkInByToken - hanya tabel dan kolom waktunya yang beda.
export async function checkInCommitteeByToken(token: string, eventId: string) {
  await requireAdmin();

  const [assignment] = await db
    .select({ id: eventCommittee.id, userId: eventCommittee.userId, checkedInAt: eventCommittee.checkedInAt })
    .from(eventCommittee)
    .where(and(eq(eventCommittee.attendanceToken, token), eq(eventCommittee.eventId, eventId)));

  if (!assignment) return { ok: false as const };
  if (assignment.checkedInAt) return { ok: true as const, already: true as const };

  await db.update(eventCommittee).set({ checkedInAt: new Date() }).where(eq(eventCommittee.id, assignment.id));

  const [event] = await db.select({ title: events.title }).from(events).where(eq(events.id, eventId));
  if (assignment.userId) {
    await createTemplatedNotification({
      userId: assignment.userId,
      templateKey: "event_checkin",
      variables: { eventTitle: event?.title ?? "acara" },
      relatedEntityType: "event_committee",
      relatedEntityId: assignment.id,
    });
  }

  revalidatePath(`/console/events/${eventId}`);
  return { ok: true as const, already: false as const };
}

export async function deleteEvent(eventId: string) {
  await requireAdmin();
  // galleryAlbums.eventId has no FK cascade, so delete albums (and their photos
  // via cascade) first; eventRegistrations cascade from events automatically.
  await db.delete(galleryAlbums).where(eq(galleryAlbums.eventId, eventId));
  await db.delete(events).where(eq(events.id, eventId));
  revalidatePath("/console/events");
  redirect("/console/events");
}
