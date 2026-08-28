"use server";

import { randomUUID } from "crypto";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { events, eventRegistrations, eventQuestions, eventFeeOptions, regionalBranches, sensusProfiles } from "@/db/schema";
import type { EventBiodata } from "@/db/schema";
import { hasCompletedSensus } from "@/lib/sensus-gate";
import { NON_STUDENT_BRANCH } from "@/lib/membership-status";
import { createTemplatedNotification } from "@/lib/notifications";

// Peserta yang sensusnya belum lengkap ditanyai asal cabangnya di form
// pendaftaran (lihat komentar di event_registrations.branch). Nilainya
// dicocokkan ke direktori cabang supaya kolomnya tidak jadi tempat sampah teks
// bebas; yang tidak dikenali dibuang, bukan disimpan apa adanya.
async function normalizeRegistrationBranch(raw: FormDataEntryValue | null): Promise<string | null> {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) return null;
  if (value === NON_STUDENT_BRANCH) return value;
  const known = await db
    .select({ cityName: regionalBranches.cityName })
    .from(regionalBranches)
    .where(eq(regionalBranches.cityName, value));
  return known.length > 0 ? value : null;
}

export async function registerForEvent(eventId: string, slug: string, formData?: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?returnTo=/events/${slug}`);

  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  // Event is unpublished, closed, finished, or cancelled - don't throw here
  // (a raw Error inside a Server Action surfaces as a generic #441 in prod).
  // Bounce back to the event page, which already shows the right message.
  if (!event || event.status !== "published") redirect(`/events/${slug}`);

  // By default events only need login. Sensus (verified Indonesian student in
  // China) is only required when the event opts in via requiresSensus.
  const sensusComplete = await hasCompletedSensus(session.user.id);
  if (event.requiresSensus && !sensusComplete) {
    redirect(`/sensus?returnTo=/events/${slug}`);
  }

  const [existing] = await db
    .select()
    .from(eventRegistrations)
    .where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.userId, session.user.id)));

  if (!existing) {
    // Hanya disimpan untuk peserta yang sensusnya belum lengkap. Kalau sensusnya
    // lengkap, cabangnya sudah diketahui dari sana dan itu sumber yang lebih
    // berwenang - menyalinnya ke sini cuma bikin dua nilai yang bisa berselisih.
    const branch = sensusComplete ? null : await normalizeRegistrationBranch(formData?.get("branch") ?? null);

    // Pertanyaan kustom acara: kumpulkan jawaban dari form, wajibkan yang
    // ditandai required. Pilihan tanpa opsi / tipe aneh diabaikan - admin yang
    // salah konfigurasi tidak boleh membekukan pendaftaran orang lain.
    const questions = await db
      .select()
      .from(eventQuestions)
      .where(eq(eventQuestions.eventId, eventId))
      .orderBy(eventQuestions.orderIndex, eventQuestions.id);
    const answers: Record<string, string> = {};
    for (const q of questions) {
      if (q.type === "multiselect") {
        const picked = formData
          ?.getAll(q.id)
          .map((v) => String(v).trim())
          .filter(Boolean) ?? [];
        if (picked.length > 0) answers[q.id] = picked.join(", ");
        continue;
      }
      const value = String(formData?.get(q.id) ?? "").trim();
      if (value) answers[q.id] = value;
    }
    for (const q of questions) {
      if (q.required && !answers[q.id]) redirect(`/events/${slug}`);
    }

    // Kategori tarif (event_fee_options). Kalau acara berbayar DAN punya
    // kategori, peserta wajib memilih salah satu - dan pilihannya harus milik
    // acara ini, bukan id acara lain yang ditempel lewat form.
    const feeOptions = await db
      .select({ id: eventFeeOptions.id })
      .from(eventFeeOptions)
      .where(eq(eventFeeOptions.eventId, eventId));
    const pickedFeeOption = String(formData?.get("feeOptionId") ?? "").trim();
    const feeOptionId = feeOptions.some((o) => o.id === pickedFeeOption) ? pickedFeeOption : null;
    if (event.isPaid && feeOptions.length > 0 && !feeOptionId) redirect(`/events/${slug}`);

    // Biodata lengkap (acara requiresBiodata): snapshot dari sensus bila lengkap,
    // dari form bila belum. Dibekukan di baris pendaftaran supaya ekspor selalu
    // utuh dan tidak ikut berubah kalau sensus orangnya di-update belakangan.
    let biodataJson: EventBiodata | null = null;
    if (event.requiresBiodata) {
      const [profile] = await db
        .select()
        .from(sensusProfiles)
        .where(eq(sensusProfiles.userId, session.user.id));
      if (profile?.completionStatus === "complete") {
        biodataJson = {
          fullName: profile.fullName ?? "",
          passportNumber: profile.passportNumber ?? "",
          wechatId: profile.wechatId ?? "",
          chinaPhone: profile.phoneActive ?? "",
          branch: profile.branch ?? "",
          university: profile.university ?? "",
          major: profile.major ?? "",
          entryYear: profile.entryYear != null ? String(profile.entryYear) : "",
          studentProofUrl: profile.studentCardUrl ?? "",
          source: "sensus",
        };
      } else {
        const g = (k: string) => String(formData?.get(k) ?? "").trim();
        biodataJson = {
          fullName: g("bio_fullName"),
          passportNumber: g("bio_passportNumber"),
          wechatId: g("bio_wechatId"),
          chinaPhone: g("bio_chinaPhone"),
          branch: g("bio_branch"),
          university: g("bio_university"),
          major: g("bio_major"),
          entryYear: g("bio_entryYear"),
          studentProofUrl: g("bio_studentProofUrl"),
          source: "form",
        };
        // Semua field biodata wajib di jalur form - kalau ada yang kosong,
        // pantulkan balik ke halaman acara (form-nya sendiri sudah `required`,
        // ini jaring pengaman kalau ada yang menembusnya).
        if (Object.entries(biodataJson).some(([k, v]) => k !== "source" && !v)) {
          redirect(`/events/${slug}`);
        }
      }
    }

    // Acara berbayar: pendaftaran menunggu verifikasi pembayaran dulu -
    // TANPA QR. Bendahara yang mengunci verifikasi akan mengangkatnya jadi
    // "confirmed" + menerbitkan QR (lihat updatePaymentStatus). Gratis:
    // langsung terkonfirmasi seperti biasa.
    const needsPayment = event.isPaid;

    await db.insert(eventRegistrations).values({
      eventId,
      userId: session.user.id,
      status: needsPayment ? "pending" : "confirmed",
      qrCodeToken: needsPayment ? null : randomUUID(),
      branch,
      paymentStatus: needsPayment ? "unpaid" : "not_required",
      answersJson: answers,
      feeOptionId,
      biodataJson,
    });
    // In-app confirmation for the member who just registered.
    await createTemplatedNotification({
      userId: session.user.id,
      templateKey: "event_registration",
      variables: { eventTitle: event.title },
      relatedEntityType: "event",
      relatedEntityId: eventId,
    });
  }

  redirect(`/events/${slug}/ticket`);
}
