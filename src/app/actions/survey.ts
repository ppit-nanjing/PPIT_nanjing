"use server";

import { and, asc, count, eq, gt, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { after } from "next/server";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { events, formFields, formResponses, forms, sensusProfiles, users } from "@/db/schema";
import { parseChinaLocalInput } from "@/lib/datetime";
import { requireFormManage } from "@/lib/form-access";
import { deleteLiveSheet, isSheetsConfigured } from "@/lib/google-sheets";
import { scheduleLiveSheetSync } from "@/lib/live-sheets";
import { notifyCreatorOfResponse } from "@/lib/survey-notify";
import {
  SURVEY_DESCRIPTION_MAX,
  SURVEY_HONEYPOT_FIELD,
  SURVEY_MESSAGE_MAX,
  SURVEY_TITLE_MAX,
  biodataFromSensus,
  cleanText,
  isNanjingCity,
  parseManualBiodata,
  parseSurveyAnswers,
  surveyOpenState,
  toFieldDef,
} from "@/lib/survey";
import { getSurveyAccess, listSurveyEvents } from "@/lib/survey-access";
import { UUID_RE } from "@/lib/uuid";

// Server Actions modul Formulir (formulir kustom buatan pengurus kabinet / panitia
// acara). Pembuat dan pengelola diperiksa lewat survey-access.ts dan canManageForm;
// pengisi lewat submitSurvey. Setiap aksi memeriksa haknya sendiri di server.
// Dokumentasi: docs/Formulir.md.

const DEFAULT_CONFIRMATION = "Terima kasih! Jawabanmu sudah kami terima.";

// ---------- Buat / ubah / hapus formulir ----------

export async function createSurvey(formData: FormData) {
  const sa = await getSurveyAccess();
  if (!sa) redirect("/login?returnTo=%2Fformulir");
  if (!sa.canCreate) redirect("/");

  const title = cleanText(String(formData.get("title") ?? "")).replace(/\s+/g, " ");
  if (!title) redirect("/formulir?error=title");
  if (title.length > SURVEY_TITLE_MAX) redirect("/formulir?error=title");
  const description = cleanText(String(formData.get("description") ?? "")).slice(0, SURVEY_DESCRIPTION_MAX);

  // Terikat acara (opsional): hanya acara yang boleh dipasangi formulir oleh user ini
  // (panitia acaranya, atau pemegang full/modul forms). Tanpa acara = formulir kabinet.
  const eventIdRaw = String(formData.get("eventId") ?? "").trim();
  let eventId: string | null = null;
  if (eventIdRaw) {
    if (!UUID_RE.test(eventIdRaw)) redirect("/formulir?error=event");
    const allowed = await listSurveyEvents(sa);
    if (!allowed.some((e) => e.id === eventIdRaw)) redirect("/formulir?error=event");
    eventId = eventIdRaw;
  } else if (!sa.canCreateUnbound) {
    // Panitia yang bukan pengurus kabinet hanya boleh membuat formulir untuk acaranya.
    redirect("/formulir?error=event");
  }

  const [created] = await db
    .insert(forms)
    .values({
      kind: "survei",
      eventId,
      title,
      description: description || null,
      // Draf dulu: pembuat menyusun pertanyaan sebelum membukanya.
      isOpen: false,
      allowPublic: formData.get("allowPublic") === "on",
      collectBiodata: formData.get("collectBiodata") === "on",
      confirmationMessage: DEFAULT_CONFIRMATION,
      createdBy: sa.access.userId,
    })
    .returning({ id: forms.id });

  revalidatePath("/formulir");
  redirect(`/formulir/${created.id}`);
}

async function loadSurveyForManage(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const { form } = await requireFormManage(id);
  if (form.kind !== "survei") notFound();
  return form;
}

export async function updateSurveySettings(formData: FormData) {
  const form = await loadSurveyForManage(formData);

  const title = cleanText(String(formData.get("title") ?? "")).replace(/\s+/g, " ").slice(0, SURVEY_TITLE_MAX);
  const description = cleanText(String(formData.get("description") ?? "")).slice(0, SURVEY_DESCRIPTION_MAX);
  const confirmation = cleanText(String(formData.get("confirmationMessage") ?? "")).slice(0, SURVEY_MESSAGE_MAX);
  const opensAt = parseChinaLocalInput(String(formData.get("opensAt") ?? ""));
  const closesAt = parseChinaLocalInput(String(formData.get("closesAt") ?? ""));
  if (opensAt && closesAt && closesAt <= opensAt) {
    redirect(`/formulir/${form.id}?tab=pengaturan&error=dates`);
  }

  await db
    .update(forms)
    .set({
      title: title || form.title,
      description: description || null,
      confirmationMessage: confirmation || DEFAULT_CONFIRMATION,
      isOpen: formData.get("isOpen") === "on",
      allowPublic: formData.get("allowPublic") === "on",
      collectBiodata: formData.get("collectBiodata") === "on",
      opensAt,
      closesAt,
      updatedAt: new Date(),
    })
    .where(eq(forms.id, form.id));

  // Judul dan kolom biodata ikut tampil di Google Sheet langsung (kalau sudah dibuat).
  scheduleLiveSheetSync(form.id, ["formulir"]);
  revalidatePath("/formulir");
  revalidatePath(`/formulir/${form.id}`);
  revalidatePath(`/f/${form.id}`);
}

export async function deleteSurvey(formData: FormData) {
  const form = await loadSurveyForManage(formData);
  // Pertanyaan dan semua jawaban ikut terhapus (cascade).
  await db.delete(forms).where(eq(forms.id, form.id));
  // Google Sheet langsung (kalau ada) ikut dihapus di belakang respons: kalau tidak,
  // jawaban dan biodatanya tetap terbaca pembaca sheet sampai pembersihan 30 hari.
  if (isSheetsConfigured()) {
    after(() =>
      deleteLiveSheet(form.id, "formulir").catch((err) => {
        const e = err as { name?: string; code?: number | string; response?: { status?: number } };
        console.error("[live-sheet] hapus sheet formulir gagal:", e.response?.status ?? e.code ?? e.name ?? "tidak diketahui");
      }),
    );
  }
  revalidatePath("/formulir");
  redirect("/formulir");
}

export async function deleteSurveyResponse(formData: FormData) {
  const form = await loadSurveyForManage(formData);
  const responseId = String(formData.get("responseId") ?? "");
  if (!UUID_RE.test(responseId)) return;
  // formId dikunci di WHERE: id jawaban milik formulir lain tidak bisa dihapus lewat sini.
  await db.delete(formResponses).where(and(eq(formResponses.id, responseId), eq(formResponses.formId, form.id)));
  scheduleLiveSheetSync(form.id, ["formulir"]);
  revalidatePath("/formulir");
  revalidatePath(`/formulir/${form.id}`);
}

// ---------- Mengisi formulir ----------

// Pembatas pengisi TANPA login. Dua lapis, tanpa tabel baru:
//  1. Per IP, di memori instance (upaya terbaik, serverless tidak berbagi memori).
//     Kampus di Tiongkok sering berbagi satu IP keluar, jadi batasnya longgar.
//  2. Per formulir, dihitung dari database (berlaku lintas instance): laju dan total
//     jawaban publik dibatasi, supaya satu formulir tidak bisa dibanjiri.
const IP_WINDOW_MS = 10 * 60 * 1000;
const IP_MAX = 30;
const PUBLIC_PER_WINDOW = 150;
const PUBLIC_TOTAL_MAX = 5000;
const ipHits = new Map<string, number[]>();

function ipLimited(ip: string, now = Date.now()): boolean {
  const recent = (ipHits.get(ip) ?? []).filter((t) => now - t < IP_WINDOW_MS);
  if (recent.length >= IP_MAX) {
    ipHits.set(ip, recent);
    return true;
  }
  recent.push(now);
  ipHits.set(ip, recent);
  if (ipHits.size > 5000) {
    for (const [key, times] of ipHits) {
      if (times.every((t) => now - t >= IP_WINDOW_MS)) ipHits.delete(key);
    }
  }
  return false;
}

async function requestIp(): Promise<string> {
  const h = await headers();
  // Vercel menimpa x-real-ip / x-forwarded-for dengan IP sebenarnya.
  return h.get("x-real-ip")?.trim() || h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function submitSurvey(formData: FormData) {
  const formId = String(formData.get("formId") ?? "");
  if (!UUID_RE.test(formId)) notFound();
  const [form] = await db.select().from(forms).where(and(eq(forms.id, formId), eq(forms.kind, "survei")));
  if (!form) notFound();
  const back = `/f/${form.id}`;

  // Acara di Sampah: formulir terkunci untuk semua orang (halaman isi juga 404).
  if (form.eventId) {
    const [ev] = await db.select({ deletedAt: events.deletedAt }).from(events).where(eq(events.id, form.eventId));
    if (!ev || ev.deletedAt) notFound();
  }

  const session = await auth();
  // Sesi hantu (akun sudah dihapus) membawa id kosong: perlakukan sebagai belum login.
  const userId = session?.user?.id || null;
  if (!userId && !form.allowPublic) redirect(`/login?returnTo=${encodeURIComponent(back)}`);

  if (userId) {
    const [account] = await db.select({ status: users.status }).from(users).where(eq(users.id, userId));
    if (!account || account.status === "suspended") redirect(`${back}?error=forbidden`);
    // Cek "sudah mengisi" sebelum cek buka/tutup: yang sudah mengisi tetap melihat konfirmasinya.
    const [existing] = await db
      .select({ id: formResponses.id })
      .from(formResponses)
      .where(and(eq(formResponses.formId, form.id), eq(formResponses.userId, userId)));
    if (existing) redirect(`${back}/terkirim`);
  }

  if (surveyOpenState(form) !== "open") redirect(`${back}?error=closed`);

  if (!userId) {
    // Kolom jebakan: manusia tidak melihatnya, bot pengisi-semua-kolom mengisinya. Ditolak
    // dengan pesan yang terlihat (bukan pura-pura berhasil): pengisi sungguhan yang kolomnya
    // ikut terisi otomatis oleh browser tidak boleh kehilangan jawabannya tanpa tahu.
    if (String(formData.get(SURVEY_HONEYPOT_FIELD) ?? "").trim() !== "") redirect(`${back}?error=spam`);
    if (ipLimited(await requestIp())) redirect(`${back}?error=toomany`);
    const since = new Date(Date.now() - IP_WINDOW_MS);
    const [recent, total] = await Promise.all([
      db
        .select({ n: count() })
        .from(formResponses)
        .where(and(eq(formResponses.formId, form.id), isNull(formResponses.userId), gt(formResponses.submittedAt, since))),
      db.select({ n: count() }).from(formResponses).where(and(eq(formResponses.formId, form.id), isNull(formResponses.userId))),
    ]);
    if ((recent[0]?.n ?? 0) >= PUBLIC_PER_WINDOW || (total[0]?.n ?? 0) >= PUBLIC_TOTAL_MAX) {
      redirect(`${back}?error=toomany`);
    }
  }

  const fieldRows = await db.select().from(formFields).where(eq(formFields.formId, form.id)).orderBy(asc(formFields.orderIndex));
  const { answers, errors } = parseSurveyAnswers(fieldRows.map(toFieldDef), formData);
  if (Object.keys(errors).length > 0) redirect(`${back}?error=invalid`);
  if (Object.keys(answers).length === 0) redirect(`${back}?error=empty`);

  // Biodata: dibaca dari database di server, bukan dari isian klien. Akun dengan
  // sensus LENGKAP memakai data sensusnya; selain itu (belum sensus, atau pengisi
  // publik) memakai isian manual.
  let biodata = null;
  let biodataSource: "sensus" | "manual" | null = null;
  if (form.collectBiodata) {
    if (userId) {
      const [sp] = await db
        .select({ fullName: sensusProfiles.fullName, university: sensusProfiles.university, branch: sensusProfiles.branch })
        .from(sensusProfiles)
        .where(and(eq(sensusProfiles.userId, userId), eq(sensusProfiles.completionStatus, "complete")));
      const fromSensus = sp ? biodataFromSensus(sp) : null;
      if (fromSensus) {
        biodata = fromSensus;
        biodataSource = "sensus";
      }
    }
    if (!biodata) {
      const manual = parseManualBiodata(formData);
      if (!manual.biodata) redirect(`${back}?error=biodata`);
      biodata = manual.biodata;
      biodataSource = "manual";
    }
  }

  // Unik (form, user): dua kiriman bersamaan dari akun yang sama menyisakan satu.
  const inserted = await db
    .insert(formResponses)
    .values({ formId: form.id, userId, biodata, biodataSource, answers })
    .onConflictDoNothing()
    .returning({ id: formResponses.id });

  // Pembuat diberi tahu di belakang respons (satu pemberitahuan belum-dibaca per formulir,
  // lihat survey-notify.ts). Kiriman ganda yang ditolak indeks unik tidak diberitahukan.
  if (inserted.length > 0) {
    after(() =>
      notifyCreatorOfResponse(form, userId).catch((err) => {
        console.error("[formulir] gagal memberi tahu pembuat:", err instanceof Error ? err.name : "tidak diketahui");
      }),
    );
  }

  // Google Sheet langsung (kalau ada) diperbarui beberapa detik lagi, di belakang respons.
  scheduleLiveSheetSync(form.id, ["formulir"]);
  revalidatePath("/formulir");
  revalidatePath(`/formulir/${form.id}`);
  // Biodata diisi sendiri dengan kota Nanjing = belum tercatat di sensus (yang sudah
  // sensus lengkap memakai biodata sensusnya): halaman terkirim mengajaknya mengisi sensus.
  const inviteSensus = biodataSource === "manual" && biodata !== null && isNanjingCity(biodata.city);
  redirect(inviteSensus ? `${back}/terkirim?sensus=1` : `${back}/terkirim`);
}
