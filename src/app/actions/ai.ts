"use server";

import { auth } from "@/auth";
import { hasModuleAccess, type AdminModule } from "@/lib/admin-scope";
import sanitizeHtml from "sanitize-html";
import { improveIndonesianText, improveEventDescriptionHtml, groqChat, type ImproveContext } from "@/lib/groq";
import { sanitizeDescriptionHtml } from "@/lib/sanitize-description-html";
import { askGuide } from "@/lib/guide-answer";
import { annotateHanziPinyin } from "@/lib/pinyin";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { aiQueryLog, users } from "@/db/schema";
import { UUID_RE } from "@/lib/uuid";

// event/news/gallery edits are gated by the matching admin module.
// feedback text improvement is open to any signed-in user (they improve their own draft).
const CONTEXT_MODULE: Record<ImproveContext, AdminModule | null> = {
  event: "events",
  news: "content",
  gallery: "content",
  feedback: null,
};

const MAX_TEXT = 4000;

export async function improveTextAction(text: string, context: ImproveContext): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Kamu harus masuk untuk menggunakan fitur ini");

  const requiredModule = CONTEXT_MODULE[context];
  if (requiredModule && !hasModuleAccess(session.user.adminScope, requiredModule)) {
    throw new Error("Kamu tidak punya akses untuk memproses teks ini");
  }

  const clean = (text ?? "").toString();
  if (clean.trim().length < 3) throw new Error("Teks terlalu pendek untuk diperbaiki");
  if (clean.length > MAX_TEXT) throw new Error(`Teks terlalu panjang (maks ${MAX_TEXT} karakter)`);

  return improveIndonesianText(clean, context);
}

const MAX_DESCRIPTION_HTML = 8000;

// Versi "perbagus" untuk deskripsi acara rich text: menerima HTML editor dan
// mengembalikan HTML yang sudah memakai format toolbar (tebal/miring/rata/
// ukuran/font). Hasilnya DISANITASI di sini - HTML dari model tidak pernah
// dipercaya, sama seperti HTML dari form.
export async function improveEventDescriptionAction(html: string): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Kamu harus masuk untuk menggunakan fitur ini");
  if (!hasModuleAccess(session.user.adminScope, "events")) {
    throw new Error("Kamu tidak punya akses untuk memproses teks ini");
  }

  const clean = (html ?? "").toString();
  if (clean.length > MAX_DESCRIPTION_HTML) throw new Error("Deskripsi terlalu panjang untuk diperbaiki");
  const plain = sanitizeHtml(clean, { allowedTags: [], allowedAttributes: {} }).trim();
  if (plain.length < 3) throw new Error("Teks terlalu pendek untuk diperbaiki");

  const improved = sanitizeDescriptionHtml(await improveEventDescriptionHtml(sanitizeDescriptionHtml(clean)));
  if (sanitizeHtml(improved, { allowedTags: [], allowedAttributes: {} }).trim().length < 3) {
    throw new Error("Respons AI tidak valid, coba lagi");
  }
  return improved;
}

const PROFILE_FIELDS = [
  "name",
  "phone",
  "wechatId",
  "linkedinUrl",
  "instagramUrl",
  "githubUrl",
  "spotifyUrl",
  "tiktokUrl",
  "avatarUrl",
] as const;
type ProfileField = (typeof PROFILE_FIELDS)[number];

const FIELD_MAX: Record<ProfileField, number> = {
  name: 80,
  phone: 30,
  wechatId: 60,
  linkedinUrl: 500,
  instagramUrl: 500,
  githubUrl: 500,
  spotifyUrl: 500,
  tiktokUrl: 500,
  avatarUrl: 2000,
};

export type ChatCitation = { title: string; slug: string | null; pageFrom: number | null; pageTo: number | null };

export type ChatResult = {
  reply: string;
  profileEdit?: { field: ProfileField; value: string };
  // Sumber jawaban, pertanyaan lanjutan, dan id baris log untuk tombol
  // suka/tidak suka. Widget chat menampilkan ketiganya di bawah balasan.
  citations: ChatCitation[];
  followUps: string[];
  logId: string;
};

export async function chatWithAIAction(history: { role: "user" | "assistant"; content: string }[]): Promise<ChatResult> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Kamu harus masuk untuk menggunakan asisten AI");

  const recent = history.slice(-12).map((m) => ({ role: m.role, content: m.content }));
  if (recent.length === 0) throw new Error("Pesan kosong");

  // Jawaban diambil lewat askGuide (src/lib/guide-answer.ts): retrieval dari
  // artikel yang sudah ditinjau, cache per corpus_version, kuota harian, baru
  // Groq. Kalau AI-nya mati, kuotanya habis, atau Groq menolak, jawabannya
  // panduan yang paling relevan, bukan pesan error.
  const question = [...recent].reverse().find((m) => m.role === "user")?.content ?? "";
  const answer = await askGuide({ userId: session.user.id, question, history: recent });
  const raw = answer.reply;

  const marker = raw.match(/<<PROFILE_EDIT:([\s\S]*?)>>/);
  if (marker) {
    try {
      const parsed = JSON.parse(marker[1]) as { field?: string; value?: string };
      const field = parsed.field as ProfileField;
      const value = String(parsed.value ?? "").trim();
      if ((PROFILE_FIELDS as readonly string[]).includes(field) && value && value.length <= FIELD_MAX[field]) {
        return { reply: "", profileEdit: { field, value }, citations: [], followUps: [], logId: answer.logId };
      }
    } catch {
      // fall through to normal reply
    }
  }
  return { reply: annotateHanziPinyin(raw), citations: answer.citations, followUps: answer.followUps, logId: answer.logId };
}

/**
 * Suara pengguna atas satu jawaban (tombol suka/tidak suka di widget chat).
 * Ditulis ke baris ai_query_log yang memang milik pemanggilnya: id baris itu
 * dikirim klien, jadi tanpa syarat user_id orang lain bisa menilai jawaban
 * orang lain. Id-nya disaring dulu - Postgres melempar error sintaks (bukan 0
 * baris) untuk teks yang bukan UUID.
 */
export async function rateAnswerAction(logId: string, vote: "up" | "down"): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Kamu harus masuk");
  if (vote !== "up" && vote !== "down") throw new Error("Nilai masukan tidak dikenal");
  if (typeof logId !== "string" || !UUID_RE.test(logId)) throw new Error("Jawaban tidak dikenal");

  const updated = await db
    .update(aiQueryLog)
    .set({ feedback: vote })
    .where(and(eq(aiQueryLog.id, logId), eq(aiQueryLog.userId, session.user.id)))
    .returning({ id: aiQueryLog.id });
  if (updated.length === 0) throw new Error("Jawaban tidak dikenal");
}

/**
 * Guarded single-field profile update. The chatbot may only *propose* a change;
 * this is the only path that writes, and it is scoped to a whitelisted field,
 * length-checked, and owned by the current session user.
 */
export async function updateProfileFieldAction(field: string, value: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Kamu harus masuk");
  if (!(PROFILE_FIELDS as readonly string[]).includes(field)) throw new Error("Field profil tidak valid");
  const f = field as ProfileField;
  const v = value.trim();
  if (!v) throw new Error("Nilai tidak boleh kosong");
  if (v.length > FIELD_MAX[f]) throw new Error("Nilai terlalu panjang");
  if (f.endsWith("Url") && !/^https?:\/\//i.test(v)) throw new Error("URL harus dimulai dengan http(s)://");

  await db.update(users).set({ [f]: v } as Partial<typeof users.$inferInsert>).where(eq(users.id, session.user.id));
}

export async function suggestContentAction(
  context: "event" | "news",
  fields: Record<string, string>,
): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Kamu harus masuk untuk menggunakan fitur ini");
  const required = context === "event" ? "events" : "content";
  if (!hasModuleAccess(session.user.adminScope, required)) throw new Error("Kamu tidak punya akses");

  const text = Object.entries(fields)
    .map(([k, v]) => `${k}: ${v?.toString().trim() || "(kosong)"}`)
    .join("\n");
  if (text.replace(/\(kosong\)/g, "").trim().length < 3) {
    throw new Error("Isi dulu bagian yang ingin disarankan");
  }

  const system =
    context === "event"
      ? "Kamu adalah konsultan konten PPIT Nanjing, organisasi mahasiswa Indonesia di Nanjing. Berikan 2-4 saran singkat dan konkret dalam Bahasa Indonesia untuk memperbaiki draf kegiatan ini (judul lebih menarik, deskripsi lebih jelas, atau hal yang terlewat). Balas sebagai daftar bernomor tanpa kalimat pembuka maupun penutup."
      : "Kamu adalah editor berita PPIT Nanjing. Berikan 2-4 saran singkat dan konkret dalam Bahasa Indonesia untuk memperbaiki draf berita ini. Balas sebagai daftar bernomor tanpa kalimat pembuka maupun penutup.";

  return groqChat(
    [
      { role: "system", content: system },
      { role: "user", content: text },
    ],
    { temperature: 0.5, maxTokens: 400 },
  );
}
