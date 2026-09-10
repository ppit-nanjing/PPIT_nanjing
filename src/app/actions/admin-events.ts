"use server";

import { eq, and, or, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { events, eventRegistrations, eventQuestions, eventCommittee, eventFeeOptions, galleryAlbums } from "@/db/schema";
import { hasModuleAccess } from "@/lib/admin-scope";
import { requireEventCapability } from "@/lib/event-access";
import { logEventAudit } from "@/lib/event-audit";
import { UUID_RE } from "@/lib/uuid";
import { createTemplatedNotification } from "@/lib/notifications";
import { checkInBlockReason, checkInClosedReason } from "@/lib/event-checkin";
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

// Warna halaman acara: hanya HEX #rrggbb yang diterima, apa pun selain itu jadi
// null (dipakai di <style> yang di-inline; validasi ini yang menjaga tidak ada
// yang bisa menyuntik CSS lewat kolom warna).
function parseHex(formData: FormData, key: string): string | null {
  const v = String(formData.get(key) ?? "").trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(v) ? v : null;
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

// Kehadiran final pasca-acara: diketik manual (Zoom/webinar sering tanpa
// pendaftaran portal). Kosong = null (halaman pakai angka terdaftar seperti
// biasa); apa pun yang diisi harus bilangan cacah non-negatif dan muat di
// kolom `integer` Postgres (batas atas 2^31-1) — kalau tidak, insert-nya
// gagal di level DB dan seluruh simpanan admin hilang.
function parseFinalAttendeeCount(formData: FormData): number | null {
  const raw = String(formData.get("finalAttendeeCount") ?? "").trim();
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 2_147_483_647) {
    throw new Error("Jumlah kehadiran harus berupa angka bulat antara 0 dan 2.147.483.647");
  }
  return parsed;
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
      requiresBiodata: formData.get("requiresBiodata") === "on",
      confirmationInfo: String(formData.get("confirmationInfo") ?? "").trim() || null,
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
      themeBg: parseHex(formData, "themeBg"),
      themeAccent: parseHex(formData, "themeAccent"),
      themeAccent2: parseHex(formData, "themeAccent2"),
    })
    .returning();

  redirect(`/console/events/${created.id}`);
}

// Form edit acara dipecah tiga sesuai tingkat aksesnya (lihat
// event-capabilities.ts): Info & Pengaturan (event.editInfo, BPH Panitia),
// Deskripsi & Agenda (event.editContent, DASAR), Setelah Acara
// (event.postEventReport, DASAR). Status/publikasi lewat setEventStatus.

async function revalidateEventPaths(id: string, slug?: string | null) {
  revalidatePath(`/console/events/${id}`);
  if (slug) revalidatePath(`/events/${slug}`);
}

/** Bagian 1–2: identitas acara + aturan pendaftaran + HTM + jadwal rilis. */
export async function updateEventInfo(id: string, formData: FormData) {
  await requireEventCapability(id, "event.editInfo");
  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Judul wajib diisi");

  const [before] = await db
    .select({ status: events.status, slug: events.slug })
    .from(events)
    .where(eq(events.id, id));

  const scheduledPublishAt = formData.get("scheduledPublishAt")
    ? new Date(String(formData.get("scheduledPublishAt")))
    : null;
  const isPaid = formData.get("isPaid") === "on";

  await db
    .update(events)
    .set({
      title,
      category: String(formData.get("category") ?? "").trim() || null,
      location: String(formData.get("location") ?? "").trim() || null,
      coverImageUrl: String(formData.get("coverImageUrl") ?? "").trim() || null,
      startAt: formData.get("startAt") ? new Date(String(formData.get("startAt"))) : null,
      registrationDeadline: formData.get("registrationDeadline")
        ? new Date(String(formData.get("registrationDeadline")))
        : null,
      capacity: formData.get("capacity") ? Number(formData.get("capacity")) : null,
      requiresSensus: formData.get("requiresSensus") === "on",
      requiresBiodata: formData.get("requiresBiodata") === "on",
      certificateForParticipants: formData.get("certificateForParticipants") === "on",
      volunteerSignupOpen: formData.get("volunteerSignupOpen") === "on",
      scheduledPublishAt,
      isPaid,
      feeCny: parseFeeCny(formData),
      paymentInstructions: String(formData.get("paymentInstructions") ?? "").trim() || null,
      paymentQrUrl: String(formData.get("paymentQrUrl") ?? "").trim() || null,
      alipayUid: String(formData.get("alipayUid") ?? "").trim() || null,
      themeBg: parseHex(formData, "themeBg"),
      themeAccent: parseHex(formData, "themeAccent"),
      themeAccent2: parseHex(formData, "themeAccent2"),
    })
    .where(eq(events.id, id));

  // Jadwal rilis diisi tapi acara masih draft -> "scheduled" supaya publik-nya
  // rilis otomatis saat waktunya tiba. Kebalikannya juga: jadwal dikosongkan
  // pada acara "scheduled" -> kembali "draft", supaya tidak nyangkut selamanya
  // (publishDueEvents menyaring scheduledPublishAt is not null).
  if (scheduledPublishAt && before?.status === "draft") {
    await db.update(events).set({ status: "scheduled" }).where(eq(events.id, id));
  } else if (!scheduledPublishAt && before?.status === "scheduled") {
    await db.update(events).set({ status: "draft" }).where(eq(events.id, id));
  }

  // An event can go free -> paid after people already registered (fee often
  // isn't known until a sponsor is confirmed). Anyone still "not_required"
  // now owes money and needs to show up in the verification queue. Only widens
  // tracking, never narrows it.
  if (isPaid) {
    await db
      .update(eventRegistrations)
      .set({ paymentStatus: "unpaid" })
      .where(and(eq(eventRegistrations.eventId, id), eq(eventRegistrations.paymentStatus, "not_required")));
  }

  await revalidateEventPaths(id, before?.slug);
}

/** Bagian 3: deskripsi, agenda, info setelah daftar. Fitur DASAR panitia. */
export async function updateEventContent(id: string, formData: FormData) {
  await requireEventCapability(id, "event.editContent");
  const [before] = await db.select({ slug: events.slug }).from(events).where(eq(events.id, id));
  await db
    .update(events)
    .set({
      description: String(formData.get("description") ?? "").trim() || null,
      agenda: String(formData.get("agenda") ?? "").trim() || null,
      confirmationInfo: String(formData.get("confirmationInfo") ?? "").trim() || null,
    })
    .where(eq(events.id, id));
  await revalidateEventPaths(id, before?.slug);
}

/** Bagian 4: kehadiran final + dokumentasi pasca-acara. Fitur DASAR panitia. */
export async function updateEventPostReport(id: string, formData: FormData) {
  await requireEventCapability(id, "event.postEventReport");
  const recapVideoRaw = String(formData.get("recapVideoUrl") ?? "").trim();
  if (recapVideoRaw && !isValidHttpUrl(recapVideoRaw)) {
    throw new Error("Link video recap harus diawali http:// atau https://");
  }
  const [before] = await db.select({ slug: events.slug }).from(events).where(eq(events.id, id));

  await db
    .update(events)
    .set({
      finalAttendeeCount: parseFinalAttendeeCount(formData),
      attendanceNote: String(formData.get("attendanceNote") ?? "").trim() || null,
      recapVideoUrl: recapVideoRaw || null,
    })
    .where(eq(events.id, id));

  // Album dokumentasi: galleryAlbums.eventId adalah tautannya. "" = lepas tautan;
  // UUID valid = tautkan; nilai lain = jangan sentuh (mencegah error sintaks
  // UUID Postgres menggagalkan aksi). Penautan HANYA menerima album yang belum
  // tertaut atau sudah milik acara ini — tanpa ini panitia mana pun bisa
  // "mencuri" album acara lain dengan mem-POST UUID-nya.
  const albumIdRaw = String(formData.get("documentationAlbumId") ?? "").trim();
  if (albumIdRaw === "" || UUID_RE.test(albumIdRaw)) {
    await db.update(galleryAlbums).set({ eventId: null }).where(eq(galleryAlbums.eventId, id));
    if (albumIdRaw) {
      await db
        .update(galleryAlbums)
        .set({ eventId: id })
        .where(and(eq(galleryAlbums.id, albumIdRaw), or(isNull(galleryAlbums.eventId), eq(galleryAlbums.eventId, id))));
    }
  }

  await revalidateEventPaths(id, before?.slug);
  revalidatePath("/console/content");
  revalidatePath("/gallery");
}

// Quick status change from the event list (e.g. a "Jadikan Draft" button).
// Accepts FormData so it can be wired directly to a <form action> without .bind().
export async function setEventStatus(formData: FormData) {
  const id = String(formData.get("eventId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !status) throw new Error("eventId dan status wajib diisi");

  const [before] = await db.select({ status: events.status, slug: events.slug }).from(events).where(eq(events.id, id));

  // "Buka / tutup pendaftaran" = tukar published <-> registration_closed. Itu
  // fitur DASAR panitia (event.registrationToggle). Perubahan status lain
  // (rilis, jadwalkan, selesai, batal) tetap wewenang BPH Panitia (event.publish).
  const isRegistrationToggle =
    (before?.status === "published" && status === "registration_closed") ||
    (before?.status === "registration_closed" && status === "published");
  const { session } = await requireEventCapability(
    id,
    isRegistrationToggle ? "event.registrationToggle" : "event.publish",
  );
  const actorId = session.user.id;

  await db
    .update(events)
    .set({ status: status as (typeof events.status.enumValues)[number] })
    .where(eq(events.id, id));

  const hiddenFromPublic = ["draft", "scheduled", "cancelled"];
  const auditAction =
    status === "published" && before?.status !== "published"
      ? "event.published"
      : before?.status === "published" && hiddenFromPublic.includes(status)
        ? "event.unpublished"
        : "event.status";
  await logEventAudit(actorId, id, auditAction, { before: { status: before?.status }, after: { status } });

  // Selesai = e-sertifikat peserta keluar otomatis (idempoten).
  if (status === "completed" && before?.status !== "completed") {
    await issueParticipantCertificatesCore(id, actorId);
    revalidatePath("/console/work-ledger");
  }
  revalidatePath("/console/events");
  revalidatePath(`/console/events/${id}`);
  if (before?.slug) revalidatePath(`/events/${before.slug}`);
}

// ---------- Pertanyaan pendaftaran kustom per-acara ----------

const QUESTION_TYPES = ["text", "textarea", "select", "radio", "multiselect", "file"] as const;

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
  const eventId = String(formData.get("eventId") ?? "");
  await requireEventCapability(eventId, "event.registrationForm");
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
    // `id` + `eventId` bersama: mengedit pertanyaan acara LAIN dengan meng-POST
    // id-nya = no-op (0 baris), bukan pembajakan.
    await db.update(eventQuestions).set(values).where(and(eq(eventQuestions.id, id), eq(eventQuestions.eventId, eventId)));
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
  const id = String(formData.get("id") ?? "");
  const [row] = await db
    .select({ eventId: eventQuestions.eventId })
    .from(eventQuestions)
    .where(eq(eventQuestions.id, id));
  if (!row) return;
  await requireEventCapability(row.eventId, "event.registrationForm");
  await db.delete(eventQuestions).where(eq(eventQuestions.id, id));
  revalidatePath(`/console/events/${row.eventId}`);
}

// ---------- Kategori tarif per-acara (event_fee_options) ----------

function parseAmountCny(formData: FormData): number {
  const raw = String(formData.get("amountCny") ?? "").trim();
  const parsed = Number(raw);
  if (!raw || !Number.isFinite(parsed) || parsed < 0) throw new Error("Nominal harus berupa angka >= 0");
  return Math.round(parsed);
}

/** Tambah / ubah satu kategori tarif. Ada `id` = ubah; tanpa = tambah di urutan terakhir. */
export async function saveFeeOption(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  if (!eventId || !label) throw new Error("Acara dan label kategori wajib diisi");
  await requireEventCapability(eventId, "event.feeTiers");
  const amountCny = parseAmountCny(formData);

  const id = String(formData.get("id") ?? "").trim();
  if (id) {
    await db
      .update(eventFeeOptions)
      .set({ label, amountCny })
      .where(and(eq(eventFeeOptions.id, id), eq(eventFeeOptions.eventId, eventId)));
  } else {
    const [{ maxOrder }] = await db
      .select({ maxOrder: sql`coalesce(max(${eventFeeOptions.orderIndex}), 0)` })
      .from(eventFeeOptions)
      .where(eq(eventFeeOptions.eventId, eventId));
    await db.insert(eventFeeOptions).values({ eventId, label, amountCny, orderIndex: Number(maxOrder) + 1 });
  }
  revalidatePath(`/console/events/${eventId}`);
}

export async function deleteFeeOption(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const [row] = await db
    .select({ eventId: eventFeeOptions.eventId })
    .from(eventFeeOptions)
    .where(eq(eventFeeOptions.id, id));
  if (!row) return;
  await requireEventCapability(row.eventId, "event.feeTiers");
  // Baris pendaftaran yang menunjuk opsi ini otomatis jadi NULL (ON DELETE SET
  // NULL) - riwayat siapa daftar tidak hilang, cuma kategori tarifnya kosong.
  await db.delete(eventFeeOptions).where(eq(eventFeeOptions.id, id));
  revalidatePath(`/console/events/${row.eventId}`);
}

export async function checkInRegistration(
  registrationId: string,
  eventId: string,
): Promise<
  { ok: true; already: boolean } | { ok: false; reason: "notfound" | "cancelled" | "unpaid" | "closed" }
> {
  const { session, isFullAdmin } = await requireEventCapability(eventId, "event.scanAttendance");
  const [registration] = await db
    .select({
      userId: eventRegistrations.userId,
      status: eventRegistrations.status,
      paymentStatus: eventRegistrations.paymentStatus,
    })
    .from(eventRegistrations)
    // Pendaftaran HARUS milik acara yang scanAttendance-nya barusan dicek —
    // tanpa filter eventId, pemegang grant scan acara A bisa menandai hadir
    // pendaftar acara B lewat registrationId-nya.
    .where(and(eq(eventRegistrations.id, registrationId), eq(eventRegistrations.eventId, eventId)));
  if (!registration) return { ok: false, reason: "notfound" };
  const [event] = await db
    .select({ title: events.title, isPaid: events.isPaid, status: events.status, startAt: events.startAt, endAt: events.endAt })
    .from(events)
    .where(eq(events.id, eventId));

  if (registration.status === "attended") return { ok: true, already: true };

  // Pintu check-in menutup otomatis setelah acara berakhir — kecuali BPH Kabinet
  // / Divisi Teknologi (isFullAdmin), yang tetap bisa mengoreksi kehadiran kapan
  // pun, sama seperti kunci 2-minggu.
  if (!isFullAdmin && event && checkInClosedReason(event)) return { ok: false, reason: "closed" };

  // Tombol check-in manual harus tunduk pada aturan yang sama dengan pintu QR:
  // acara berbayar wajib pembayaran terverifikasi dulu.
  const blocked = checkInBlockReason(registration, event?.isPaid ?? false);
  if (blocked) return { ok: false, reason: blocked };

  await db
    .update(eventRegistrations)
    .set({ status: "attended", checkedInAt: new Date(), checkedInBy: session.user.id })
    .where(and(eq(eventRegistrations.id, registrationId), eq(eventRegistrations.eventId, eventId)));

  if (registration.userId) {
    await createTemplatedNotification({
      userId: registration.userId,
      templateKey: "event_checkin",
      variables: { eventTitle: event?.title ?? "acara" },
      relatedEntityType: "event_registration",
      relatedEntityId: registrationId,
    });
  }

  revalidatePath(`/console/events/${eventId}`);
  return { ok: true, already: false };
}

// Check-in by the QR token scanned from a ticket. Separated from the scan page
// render so the db write happens in a server action (triggered client-side
// after the page loads) rather than during the Server Component render - doing
// a mutation inside a render breaks RSC streaming in production.
export async function checkInByToken(token: string, eventId: string) {
  const { session, isFullAdmin } = await requireEventCapability(eventId, "event.scanAttendance");

  const [registration] = await db
    .select({
      id: eventRegistrations.id,
      userId: eventRegistrations.userId,
      status: eventRegistrations.status,
      paymentStatus: eventRegistrations.paymentStatus,
    })
    .from(eventRegistrations)
    .where(and(eq(eventRegistrations.qrCodeToken, token), eq(eventRegistrations.eventId, eventId)));

  if (!registration) return { ok: false as const };

  if (registration.status === "attended") {
    return { ok: true as const, already: true as const };
  }

  const [event] = await db
    .select({ title: events.title, isPaid: events.isPaid, status: events.status, startAt: events.startAt, endAt: events.endAt })
    .from(events)
    .where(eq(events.id, eventId));

  // Pintu check-in menutup otomatis setelah acara berakhir (BPH Kabinet / Divisi
  // Teknologi tetap bisa mengoreksi kapan pun).
  if (!isFullAdmin && event && checkInClosedReason(event)) return { ok: false as const, reason: "closed" as const };

  // Jaring pengaman: normalnya pendaftaran berbayar yang belum lunas tidak
  // punya QR sama sekali, tapi kalau pembayaran sempat terverifikasi (QR terbit)
  // lalu dibatalkan/ditolak, QR-nya masih hidup - blokir di sini juga.
  const blocked = checkInBlockReason(registration, event?.isPaid ?? false);
  if (blocked) return { ok: false as const, reason: blocked };

  await db
    .update(eventRegistrations)
    .set({ status: "attended", checkedInAt: new Date(), checkedInBy: session.user.id })
    .where(eq(eventRegistrations.id, registration.id));
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
  const { session, isFullAdmin } = await requireEventCapability(eventId, "event.scanAttendance");

  const [assignment] = await db
    .select({ id: eventCommittee.id, userId: eventCommittee.userId, checkedInAt: eventCommittee.checkedInAt })
    .from(eventCommittee)
    .where(and(eq(eventCommittee.attendanceToken, token), eq(eventCommittee.eventId, eventId)));

  if (!assignment) return { ok: false as const };
  if (assignment.checkedInAt) return { ok: true as const, already: true as const };

  const [event] = await db
    .select({ title: events.title, status: events.status, startAt: events.startAt, endAt: events.endAt })
    .from(events)
    .where(eq(events.id, eventId));

  // Pintu check-in menutup otomatis setelah acara berakhir (BPH Kabinet / Divisi
  // Teknologi tetap bisa mengoreksi kapan pun).
  if (!isFullAdmin && event && checkInClosedReason(event)) return { ok: false as const, reason: "closed" as const };

  await db
    .update(eventCommittee)
    .set({ checkedInAt: new Date(), checkedInBy: session.user.id })
    .where(eq(eventCommittee.id, assignment.id));

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
  // Tidak ada peran kepanitiaan yang boleh menghapus acara — hanya BPH "full"
  // (lolos lewat isFullAdmin di getEventAccess).
  const { session } = await requireEventCapability(eventId, "event.delete");
  const [doomed] = await db.select({ title: events.title, status: events.status }).from(events).where(eq(events.id, eventId));
  // Dicatat SEBELUM dihapus; audit_logs.entity_id tidak ber-FK ke events jadi
  // recordnya tetap ada setelah acaranya hilang.
  await logEventAudit(session.user.id, eventId, "event.deleted", { before: { title: doomed?.title, status: doomed?.status } });
  // Gallery albums are curated by the content team and merely *link* to an event
  // (galleryAlbums.eventId, set from the "Setelah Acara" dropdown). Deleting the
  // event must NOT destroy the album or its photos — just unlink it. The FK has
  // no cascade, so do it explicitly before removing the event; eventRegistrations
  // cascade from events automatically.
  await db.update(galleryAlbums).set({ eventId: null }).where(eq(galleryAlbums.eventId, eventId));
  await db.delete(events).where(eq(events.id, eventId));
  revalidatePath("/console/events");
  revalidatePath("/console/content");
  revalidatePath("/gallery");
  redirect("/console/events");
}
