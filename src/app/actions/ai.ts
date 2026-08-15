"use server";

import { auth } from "@/auth";
import { hasModuleAccess, type AdminModule } from "@/lib/admin-scope";
import { improveIndonesianText, groqChat, AI_CHAT_SYSTEM_PROMPT, type ImproveContext, type GroqMessage } from "@/lib/groq";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

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

export const PROFILE_FIELDS = [
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

export type ChatResult = {
  reply: string;
  profileEdit?: { field: ProfileField; value: string };
};

export async function chatWithAIAction(history: { role: "user" | "assistant"; content: string }[]): Promise<ChatResult> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Kamu harus masuk untuk menggunakan asisten AI");

  const recent = history.slice(-12).map((m) => ({ role: m.role, content: m.content }));
  if (recent.length === 0) throw new Error("Pesan kosong");

  const messages: GroqMessage[] = [{ role: "system", content: AI_CHAT_SYSTEM_PROMPT }, ...recent];
  const raw = await groqChat(messages, { temperature: 0.5, maxTokens: 500 });

  const marker = raw.match(/<<PROFILE_EDIT:([\s\S]*?)>>/);
  if (marker) {
    try {
      const parsed = JSON.parse(marker[1]) as { field?: string; value?: string };
      const field = parsed.field as ProfileField;
      const value = String(parsed.value ?? "").trim();
      if ((PROFILE_FIELDS as readonly string[]).includes(field) && value && value.length <= FIELD_MAX[field]) {
        return { reply: "", profileEdit: { field, value } };
      }
    } catch {
      // fall through to normal reply
    }
  }
  return { reply: raw };
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
