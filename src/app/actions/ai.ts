"use server";

import { auth } from "@/auth";
import { hasModuleAccess, type AdminModule } from "@/lib/admin-scope";
import { improveIndonesianText, groqChat, AI_CHAT_SYSTEM_PROMPT, type ImproveContext, type GroqMessage } from "@/lib/groq";

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

export async function chatWithAIAction(history: { role: "user" | "assistant"; content: string }[]): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Kamu harus masuk untuk menggunakan asisten AI");

  const recent = history.slice(-12).map((m) => ({ role: m.role, content: m.content }));
  if (recent.length === 0) throw new Error("Pesan kosong");

  const messages: GroqMessage[] = [{ role: "system", content: AI_CHAT_SYSTEM_PROMPT }, ...recent];
  return groqChat(messages, { temperature: 0.5, maxTokens: 500 });
}
