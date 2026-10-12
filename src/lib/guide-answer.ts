import { createHash } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { aiQueryLog, aiUsage, guideAnswers, guideChunks, guideMeta, helpArticles } from "@/db/schema";
import { buildChatSystemPrompt, detectAnswerLanguage, groqChat, type GroqMessage } from "./groq";
import { buildGuideContext, findGuideChunks, RETRIEVABLE_ARTICLE, type GuideChunk } from "./guidebook-search";
import { questionEntities, searchTerms } from "./guidebook-terms";

// Jalur jawaban guidebook maba (docs/Guidebook Maba.md, bagian "AI answer path",
// "Token and quota budget", dan "Edge cases"). Bukan Server Action: dipakai
// Server Action chat (src/app/actions/ai.ts) dan script prewarm
// (scripts/prewarm-guide.ts), jadi tidak ada "use server" di sini.
//
// Urutannya: kata kunci -> potongan -> cache jawaban -> kuota harian -> Groq.
// Aturan yang mengikat:
// - sitasi selalu dari baris guide_chunks di DB, bukan dari teks model;
// - tidak ada potongan = tidak ada panggilan LLM, jawabannya tetap (soft refusal);
// - jawaban hasil degradasi/refusal tidak pernah ditulis ke cache;
// - cache hit tidak memakan kuota;
// - pertanyaan mentah tidak pernah disimpan, hanya bentuk tersunting.

export const DAILY_QUESTION_LIMIT = 15;

// Rencana: pertanyaan lebih dari 500 karakter dipotong untuk retrieval, sisanya
// diabaikan. Batas yang sama dipakai untuk hash cache supaya pertanyaan panjang
// tidak jadi kunci baru hanya karena ekornya berbeda.
const MAX_QUESTION_CHARS = 500;

// Asia/Shanghai = UTC+8 tanpa DST, jadi offsetnya tetap. Tanggalnya dihitung di
// sini, bukan dari zona waktu server, supaya kuota tidak reset di jam aneh.
const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;

const REFUSAL_NO_KEYWORDS =
  "Pertanyaannya belum cukup jelas. Coba tulis dengan kata yang lebih spesifik, " +
  "atau lihat daftar topik panduan di /guidebook.";
const REFUSAL_NO_CHUNKS =
  "Belum ada panduan yang cocok dengan pertanyaan itu. Coba pakai kata lain, " +
  "atau lihat daftar topik panduan di /guidebook.";

const DEGRADED_HEADER: Record<string, string> = {
  kuota_harian: "Kuota tanya AI hari ini sudah habis (15 pertanyaan sehari). Ini panduan yang paling relevan:",
  ai_nonaktif: "Asisten AI sedang dimatikan sementara oleh pengurus. Ini panduan yang paling relevan:",
};

const DEGRADED_HEADER_DEFAULT = "Asisten AI sedang tidak bisa dipakai. Ini panduan yang paling relevan:";

// Penanda profil di system prompt (lihat buildChatSystemPrompt). Jawaban yang
// memuatnya bergantung pada data satu pengguna, jadi jangan pernah masuk cache:
// pengguna lain yang menanyakan kalimat sama akan menerima usulan edit itu.
const PROFILE_EDIT_MARKER = "<<PROFILE_EDIT:";

export type GuideAnswer = {
  reply: string;
  citations: { title: string; slug: string | null; pageFrom: number | null; pageTo: number | null }[];
  cacheHit: boolean;
  degraded: boolean;
  degradedReason: string | null;
};

type ChunkRow = {
  id: string;
  slug: string;
  title: string;
  ordinal: number;
  pageFrom: number | null;
  pageTo: number | null;
  text: string;
};

function normalizeQuestion(question: string): string {
  return (question ?? "").toLowerCase().replace(/\s+/g, " ").trim().slice(0, MAX_QUESTION_CHARS);
}

/**
 * Pertanyaan yang disimpan/di-hash tidak boleh memuat data pribadi (aturan repo:
 * jangan pernah mengirim data pribadi ke penyedia AI, dan teks mentahnya tidak
 * pernah disimpan). Email, nomor telepon, dan deretan angka panjang (NIM,
 * nomor paspor) diganti penanda sebelum masuk question_hash/question_redacted.
 */
function redactQuestion(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]")
    .replace(/\+?\d[\d\s().-]{6,}\d/g, "[nomor]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_QUESTION_CHARS);
}

// Hash dihitung dari bentuk yang sudah disunting, bukan teks mentah: hash nomor
// telepon bisa dipecah balik lewat brute force. Efek sampingnya pertanyaan yang
// bedanya cuma angka berbagi satu jawaban cache, dan itu jawaban umum, bukan
// data pribadi siapa pun.
function questionHash(redacted: string): string {
  return createHash("sha256").update(redacted).digest("hex");
}

function shanghaiDay(): string {
  return new Date(Date.now() + SHANGHAI_OFFSET_MS).toISOString().slice(0, 10);
}

/** Kunci cache = hash pertanyaan + corpus_version (lihat guidebook-index.ts). */
async function loadMeta(): Promise<{ corpusVersion: number; aiEnabled: boolean }> {
  const [row] = await db
    .select({ corpusVersion: guideMeta.corpusVersion, aiEnabled: guideMeta.aiEnabled })
    .from(guideMeta)
    .limit(1);
  return { corpusVersion: row?.corpusVersion ?? 1, aiEnabled: row?.aiEnabled ?? true };
}

/**
 * Potongan yang boleh dikutip. Gerbangnya sama dengan findGuideChunks
 * (RETRIEVABLE_ARTICLE, definisinya di sana) karena jalur cache membaca baris
 * potongan langsung dari id yang tersimpan: tanpa gerbang di sini, topik yang
 * baru disembunyikan atau kedaluwarsa masih ikut terbit lewat cache selama
 * corpus_version belum naik.
 */
async function loadChunks(scope: { slugs: string[] } | { ids: string[] }): Promise<ChunkRow[]> {
  const scopeWhere = "ids" in scope
    ? inArray(guideChunks.id, scope.ids)
    : inArray(helpArticles.slug, scope.slugs);
  return db
    .select({
      id: guideChunks.id,
      slug: helpArticles.slug,
      title: helpArticles.title,
      ordinal: guideChunks.ordinal,
      pageFrom: guideChunks.pageFrom,
      pageTo: guideChunks.pageTo,
      text: guideChunks.text,
    })
    .from(guideChunks)
    .innerJoin(helpArticles, eq(guideChunks.articleId, helpArticles.id))
    .where(sql`${scopeWhere} and ${RETRIEVABLE_ARTICLE}`)
    .orderBy(helpArticles.sortOrder, guideChunks.ordinal);
}

function citationsFrom(chunks: ChunkRow[]): GuideAnswer["citations"] {
  const bySlug = new Map<string, GuideAnswer["citations"][number]>();
  for (const chunk of chunks) {
    const existing = bySlug.get(chunk.slug);
    if (!existing) {
      bySlug.set(chunk.slug, {
        title: chunk.title,
        slug: chunk.slug,
        pageFrom: chunk.pageFrom,
        pageTo: chunk.pageTo,
      });
      continue;
    }
    if (chunk.pageFrom !== null && (existing.pageFrom === null || chunk.pageFrom < existing.pageFrom)) {
      existing.pageFrom = chunk.pageFrom;
    }
    if (chunk.pageTo !== null && (existing.pageTo === null || chunk.pageTo > existing.pageTo)) {
      existing.pageTo = chunk.pageTo;
    }
  }
  return [...bySlug.values()];
}

/** Satu paragraf pendek per topik, cukup untuk jawaban cadangan tanpa LLM. */
function excerpt(text: string, max = 220): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut).trimEnd()}...`;
}

function retrievalReply(reason: string, chunks: ChunkRow[]): string {
  const header = DEGRADED_HEADER[reason] ?? DEGRADED_HEADER_DEFAULT;
  const seen = new Set<string>();
  const blocks: string[] = [];
  for (const chunk of chunks) {
    if (seen.has(chunk.slug)) continue;
    seen.add(chunk.slug);
    const pages = chunk.pageFrom !== null || chunk.pageTo !== null
      ? ` (hal. ${chunk.pageFrom ?? "?"}${chunk.pageTo !== null && chunk.pageTo !== chunk.pageFrom ? `-${chunk.pageTo}` : ""})`
      : "";
    blocks.push(`${chunk.title}${pages}\n${excerpt(chunk.text)}\nBaca: /help/${chunk.slug}`);
    if (blocks.length === 3) break;
  }
  return `${header}\n\n${blocks.join("\n\n")}`;
}

function degradedReasonFromError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (/sibuk/i.test(message) || message.includes("(429)")) return "groq_429";
  if (/timeout|abort/i.test(message)) return "groq_timeout";
  const status = message.match(/\((\d{3})\)/)?.[1];
  return status ? `groq_${status}` : "groq_error";
}

type LogInput = {
  userId: string | null;
  question: string;
  chunkIds: string[];
  cacheHit: boolean;
  usedLlm: boolean;
  degradedReason: string | null;
  latencyMs: number;
};

async function logQuery(input: LogInput): Promise<void> {
  const redacted = redactQuestion(input.question);
  await db.insert(aiQueryLog).values({
    userId: input.userId,
    questionHash: questionHash(redacted),
    questionRedacted: redacted,
    chunkIds: input.chunkIds,
    cacheHit: input.cacheHit,
    usedLlm: input.usedLlm,
    degradedReason: input.degradedReason,
    latencyMs: input.latencyMs,
  });
}

/**
 * Retrieval potongan yang boleh dikutip. null = soft refusal: pertanyaannya
 * tidak punya kata kunci, tidak ada artikel yang cocok, atau artikel yang cocok
 * belum punya potongan. Semuanya tanpa panggilan LLM.
 */
async function retrieve(question: string): Promise<{ articles: GuideChunk[]; chunks: ChunkRow[] } | null> {
  const articles = await findGuideChunks(question);
  if (articles.length === 0) return null;
  const chunks = await loadChunks({ slugs: articles.map((a) => a.slug) });
  if (chunks.length === 0) return null;
  return { articles, chunks };
}

export async function askGuide(input: {
  userId: string;
  question: string;
  history: { role: "user" | "assistant"; content: string }[];
}): Promise<GuideAnswer> {
  const started = Date.now();
  const question = normalizeQuestion(input.question);

  // Fixed refusal: tanpa kata kunci, jawabannya tidak dicari dan tidak di-cache.
  const refuse = async (reply: string): Promise<GuideAnswer> => {
    await logQuery({
      userId: input.userId,
      question,
      chunkIds: [],
      cacheHit: false,
      usedLlm: false,
      degradedReason: null,
      latencyMs: Date.now() - started,
    });
    return { reply, citations: [], cacheHit: false, degraded: false, degradedReason: null };
  };

  if (searchTerms(question).length === 0 && questionEntities(question).length === 0) {
    return refuse(REFUSAL_NO_KEYWORDS);
  }

  const retrieved = await retrieve(question);
  if (!retrieved) return refuse(REFUSAL_NO_CHUNKS);

  const { articles, chunks } = retrieved;
  const chunkIds = chunks.map((c) => c.id);
  const citations = citationsFrom(chunks);
  const redacted = redactQuestion(question);
  const hash = questionHash(redacted);
  const { corpusVersion, aiEnabled } = await loadMeta();

  // Cache hit tidak memakan kuota. Sitasinya tetap dibaca dari baris potongan,
  // jadi artikel yang sudah disembunyikan, dibatalkan tinjauannya, atau
  // kedaluwarsa tidak ikut terbit lewat cache walau corpus_version tidak naik.
  const cached = await findCachedAnswer(hash, corpusVersion);
  const cachedChunks = cached && cached.chunkIds.length > 0
    ? await loadChunks({ ids: cached.chunkIds })
    : [];
  if (cached && cachedChunks.length > 0) {
    await bumpHits(hash, corpusVersion);
    await logQuery({
      userId: input.userId,
      question,
      chunkIds: cached.chunkIds,
      cacheHit: true,
      usedLlm: false,
      degradedReason: null,
      latencyMs: Date.now() - started,
    });
    return {
      reply: cached.answer,
      citations: citationsFrom(cachedChunks),
      cacheHit: true,
      degraded: false,
      degradedReason: null,
    };
  }

  const degraded = async (reason: string, usedLlm: boolean): Promise<GuideAnswer> => {
    await logQuery({
      userId: input.userId,
      question,
      chunkIds,
      cacheHit: false,
      usedLlm,
      degradedReason: reason,
      latencyMs: Date.now() - started,
    });
    return { reply: retrievalReply(reason, chunks), citations, cacheHit: false, degraded: true, degradedReason: reason };
  };

  if (!aiEnabled) return degraded("ai_nonaktif", false);
  if (!(await consumeQuota(input.userId))) return degraded("kuota_harian", false);

  const messages: GroqMessage[] = [
    { role: "system", content: buildChatSystemPrompt(buildGuideContext(articles), detectAnswerLanguage(question)) },
    ...input.history,
  ];
  // Prewarm memanggil tanpa history, jadi pertanyaannya belum ada di messages.
  if (!input.history.some((m) => m.role === "user")) messages.push({ role: "user", content: question });

  let reply: string;
  try {
    reply = await groqChat(messages, { temperature: 0.5, maxTokens: 400 });
  } catch (err) {
    return degraded(degradedReasonFromError(err), true);
  }

  if (!reply.includes(PROFILE_EDIT_MARKER)) await writeCache(hash, corpusVersion, redacted, reply, chunkIds);
  await logQuery({
    userId: input.userId,
    question,
    chunkIds,
    cacheHit: false,
    usedLlm: true,
    degradedReason: null,
    latencyMs: Date.now() - started,
  });
  return { reply, citations, cacheHit: false, degraded: false, degradedReason: null };
}

/**
 * Prewarm FAQ saat ingest. Jalur retrieval + cache yang sama, tanpa kuota dan
 * tanpa baris ai_usage: ini bukan pertanyaan pengguna. Lognya ditulis dengan
 * user_id null supaya tetap kelihatan di KPI.
 */
export async function warmCacheForQuestion(question: string): Promise<"cached" | "skipped" | "failed"> {
  const started = Date.now();
  const normalized = normalizeQuestion(question);
  const retrieved = searchTerms(normalized).length === 0 && questionEntities(normalized).length === 0
    ? null
    : await retrieve(normalized);

  if (!retrieved) {
    await logQuery({
      userId: null,
      question: normalized,
      chunkIds: [],
      cacheHit: false,
      usedLlm: false,
      degradedReason: null,
      latencyMs: Date.now() - started,
    });
    return "skipped";
  }

  const { articles, chunks } = retrieved;
  const chunkIds = chunks.map((c) => c.id);
  const redacted = redactQuestion(normalized);
  const hash = questionHash(redacted);
  const { corpusVersion, aiEnabled } = await loadMeta();

  if (await findCachedAnswer(hash, corpusVersion)) return "cached";
  if (!aiEnabled) return "skipped";

  try {
    const reply = await groqChat(
      [
        { role: "system", content: buildChatSystemPrompt(buildGuideContext(articles), detectAnswerLanguage(normalized)) },
        { role: "user", content: normalized },
      ],
      { temperature: 0.5, maxTokens: 400 },
    );
    await writeCache(hash, corpusVersion, redacted, reply, chunkIds);
    await logQuery({
      userId: null,
      question: normalized,
      chunkIds,
      cacheHit: false,
      usedLlm: true,
      degradedReason: null,
      latencyMs: Date.now() - started,
    });
    return "cached";
  } catch (err) {
    await logQuery({
      userId: null,
      question: normalized,
      chunkIds,
      cacheHit: false,
      usedLlm: true,
      degradedReason: degradedReasonFromError(err),
      latencyMs: Date.now() - started,
    });
    return "failed";
  }
}

function findCachedAnswer(
  hash: string,
  corpusVersion: number,
): Promise<{ answer: string; chunkIds: string[] } | undefined> {
  return db
    .select({ answer: guideAnswers.answer, chunkIds: guideAnswers.chunkIds })
    .from(guideAnswers)
    .where(and(eq(guideAnswers.questionHash, hash), eq(guideAnswers.corpusVersion, corpusVersion)))
    .limit(1)
    .then((rows) => rows[0]);
}

function bumpHits(hash: string, corpusVersion: number): Promise<unknown> {
  return db
    .update(guideAnswers)
    .set({ hits: sql`${guideAnswers.hits} + 1` })
    .where(and(eq(guideAnswers.questionHash, hash), eq(guideAnswers.corpusVersion, corpusVersion)));
}

function writeCache(
  hash: string,
  corpusVersion: number,
  question: string,
  answer: string,
  chunkIds: string[],
): Promise<unknown> {
  return db
    .insert(guideAnswers)
    .values({ questionHash: hash, corpusVersion, question, answer, chunkIds, hits: 0 })
    .onConflictDoNothing();
}

/**
 * Kuota harian per pengguna. Satu statement insert+update: kalau count sudah di
 * batas, DO UPDATE-nya tidak jalan dan tidak ada baris yang kembali, jadi
 * jawaban degradasi kuota tidak ikut dihitung sebagai pertanyaan terjawab.
 */
async function consumeQuota(userId: string): Promise<boolean> {
  const rows = await db
    .insert(aiUsage)
    .values({ userId, day: shanghaiDay(), count: 1 })
    .onConflictDoUpdate({
      target: [aiUsage.userId, aiUsage.day],
      set: { count: sql`${aiUsage.count} + 1` },
      setWhere: sql`${aiUsage.count} < ${DAILY_QUESTION_LIMIT}`,
    })
    .returning({ count: aiUsage.count });
  return rows.length > 0;
}
