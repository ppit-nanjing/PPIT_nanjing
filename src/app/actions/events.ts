"use server";

import { randomUUID } from "crypto";
import { eq, and, ne } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { events, eventRegistrations, eventQuestions, eventFeeOptions, regionalBranches, sensusProfiles } from "@/db/schema";
import type { EventBiodata } from "@/db/schema";
import { hasCompletedSensus } from "@/lib/sensus-gate";
import { NON_STUDENT_BRANCH } from "@/lib/membership-status";
import { createTemplatedNotification } from "@/lib/notifications";
import { getEventSeats } from "@/lib/event-capacity";
import { feeTierAt, amountForTier } from "@/lib/event-fee";
import { isValidPassport } from "@/lib/sensus-form";

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

// Berkas yang diunggah lewat /api/upload selalu berujung URL blob Vercel atau
// route internal /api/... - apa pun di luar itu (mis. "javascript:...") tidak
// boleh masuk DB karena nilainya nanti dirender sebagai <a href> di konsol.
function isAllowedUploadUrl(value: string): boolean {
  return (
    /^https:\/\/[a-z0-9.-]*blob\.vercel-storage\.com\//i.test(value) ||
    value.startsWith("/api/")
  );
}

const blankStr = (v: unknown) => v === null || v === undefined || (typeof v === "string" && v.trim() === "");

// Peserta yang sensusnya belum lengkap mengetik biodata (nama, paspor, WeChat,
// telpon, kota, kampus, jurusan, angkatan, KTM) langsung di form pendaftaran.
// Cerminkan field yang beririsan itu ke `sensus_profiles` orangnya supaya
// mereka tidak mengetik ulang di /sensus - HANYA mengisi kolom yang masih
// kosong, TIDAK pernah menyentuh completion_status (mereka tetap harus
// menyelesaikan wizard sensus yang menanyakan ~10 field lain). Best-effort:
// kegagalan di sini tidak boleh membatalkan pendaftaran yang sudah masuk.
async function mirrorFormBiodataToSensus(userId: string, bio: EventBiodata): Promise<void> {
  const [prof] = await db.select().from(sensusProfiles).where(eq(sensusProfiles.userId, userId));

  const patch: Partial<typeof sensusProfiles.$inferInsert> = {};
  const fill = (col: "fullName" | "wechatId" | "phoneActive" | "branch" | "university" | "major", current: unknown, incoming: string) => {
    if (blankStr(current) && !blankStr(incoming)) patch[col] = incoming.trim();
  };
  fill("fullName", prof?.fullName, bio.fullName);
  fill("wechatId", prof?.wechatId, bio.wechatId);
  fill("phoneActive", prof?.phoneActive, bio.chinaPhone);
  fill("branch", prof?.branch, bio.branch);
  fill("university", prof?.university, bio.university);
  fill("major", prof?.major, bio.major);

  if (blankStr(prof?.entryYear) && !blankStr(bio.entryYear)) {
    const y = parseInt(bio.entryYear, 10);
    if (Number.isInteger(y) && y >= 2000 && y <= 2100) patch.entryYear = y;
  }

  // passport_number kolom UNIQUE - jangan set kalau nilainya sudah dipakai
  // baris sensus lain (mis. dua orang salah ketik nomor yang sama).
  if (blankStr(prof?.passportNumber) && !blankStr(bio.passportNumber)) {
    const pp = bio.passportNumber.trim();
    const [clash] = await db
      .select({ id: sensusProfiles.id })
      .from(sensusProfiles)
      .where(and(eq(sensusProfiles.passportNumber, pp), ne(sensusProfiles.userId, userId)));
    if (!clash) patch.passportNumber = pp;
  }

  // KTM: form ini mengunggah ke folder "sensus" (store privat) -> nilainya
  // sudah berupa proxy path. Kalau bukan (data lama / fallback), lewati -
  // biar mereka unggah ulang di /sensus.
  if (blankStr(prof?.studentCardUrl) && bio.studentProofUrl.startsWith("/api/sensus/student-card/")) {
    patch.studentCardUrl = bio.studentProofUrl;
  }

  if (Object.keys(patch).length === 0) return;

  if (prof) {
    await db
      .update(sensusProfiles)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(sensusProfiles.userId, userId));
  } else {
    await db
      .insert(sensusProfiles)
      .values({ userId, completionStatus: "incomplete", updatedAt: new Date(), ...patch })
      .onConflictDoNothing();
  }
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
      // Kembali ke FORM (bukan halaman acara) dengan alasan, supaya peserta
      // tahu apa yang kurang — dulu ini pantulan senyap yang terasa seperti
      // "tombol kirim tidak berfungsi".
      if (q.required && !answers[q.id]) redirect(`/events/${slug}/register?err=question`);
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
    if (event.isPaid && feeOptions.length > 0 && !feeOptionId) redirect(`/events/${slug}/register?err=fee`);

    // Pagu kapasitas: pagu total acara (events.capacity) DAN kuota per kategori
    // tarif (event_fee_options.quota, mis. WIF Freshmen 130 / Non-freshmen 20).
    // Dihitung ulang di sini, tepat sebelum insert — halaman /register sudah
    // memantulkan yang penuh, ini jaring pengaman untuk race + POST langsung.
    // Sisa celah balapan antar dua pendaftaran serempak diterima apa adanya,
    // sama seperti cek `isFull` di halaman acara; skalanya kecil dan verifikasi
    // panitia jadi lapis terakhir.
    const seats = await getEventSeats(event);
    if (seats.capacityFull) redirect(`/events/${slug}`);
    if (feeOptionId) {
      const picked = seats.feeOptions.find((o) => o.id === feeOptionId);
      // Kategori itu penuh persis di sela ini — balik ke form supaya peserta
      // bisa pilih kategori lain yang masih ada kuotanya.
      if (picked?.isFull) redirect(`/events/${slug}/register?err=category_full`);
    }

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
        const studentProofUrl = g("bio_studentProofUrl");
        biodataJson = {
          fullName: g("bio_fullName"),
          passportNumber: g("bio_passportNumber"),
          wechatId: g("bio_wechatId"),
          chinaPhone: g("bio_chinaPhone"),
          branch: g("bio_branch"),
          university: g("bio_university"),
          major: g("bio_major"),
          entryYear: g("bio_entryYear"),
          // URL non-blob dianggap tidak ada - jaring pengaman di bawah akan
          // menolak pendaftaran sampai pengunggah memakai FileUpload yang benar.
          studentProofUrl: isAllowedUploadUrl(studentProofUrl) ? studentProofUrl : "",
          source: "form",
        };
        // Semua field biodata wajib di jalur form. Kalau ada yang kosong -
        // paling sering bukti mahasiswa yang uploadnya gagal/belum kelar di
        // koneksi lambat - balik ke FORM dengan pesan, bukan pantulan senyap.
        // Nomor paspor juga dicek bentuknya di sini (form-nya sudah `pattern`,
        // ini lapis servernya) supaya "." / "-" / "123" tidak lolos ke sensus.
        const biodataIncomplete = Object.entries(biodataJson).some(([k, v]) => k !== "source" && !v);
        if (biodataIncomplete || !isValidPassport(biodataJson.passportNumber)) {
          redirect(`/events/${slug}/register?err=biodata`);
        }
      }
    }

    // Acara berbayar: pendaftaran menunggu verifikasi pembayaran dulu -
    // TANPA QR. Bendahara yang mengunci verifikasi akan mengangkatnya jadi
    // "confirmed" + menerbitkan QR (lihat updatePaymentStatus). Gratis:
    // langsung terkonfirmasi seperti biasa.
    //
    // Nominal EFEKTIF peserta ini (tahap early bird / normal saat mendaftar):
    // ¥0 — mis. tarif early bird gratis — diperlakukan seperti acara gratis
    // (tidak digerbang, QR langsung terbit). `null` = nominal acara belum
    // ditentukan → tetap digerbang seperti sebelumnya.
    const pickedSeat = feeOptionId ? seats.feeOptions.find((o) => o.id === feeOptionId) ?? null : null;
    const effectiveAmount = pickedSeat
      ? amountForTier(feeTierAt(event.earlyBirdUntil), pickedSeat.amountCny, pickedSeat.earlyBirdAmountCny)
      : event.feeCny;
    const needsPayment = event.isPaid && effectiveAmount !== 0;

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

    // Biodata yang diketik di form (sensus belum lengkap) dicerminkan ke profil
    // sensus orangnya - sekali tulis, tak perlu ketik ulang di /sensus.
    // Best-effort: jangan sampai menggagalkan pendaftaran yang sudah masuk.
    if (biodataJson?.source === "form") {
      try {
        await mirrorFormBiodataToSensus(session.user.id, biodataJson);
      } catch (err) {
        console.error("[registerForEvent] mirror biodata -> sensus failed:", err);
      }
    }
  }

  redirect(`/events/${slug}/ticket`);
}
