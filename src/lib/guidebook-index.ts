import { eq, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { guideAnswers, guideChunks, guideMeta } from "@/db/schema";
import { CHUNKER_VERSION, chunkMarkdown } from "@/lib/guide-chunker";
import { stemmedText } from "@/lib/guidebook-terms";

// Potongan (chunk) dan versi korpus dipakai bersama oleh Server Action di
// /console/docs dan oleh script ingest (src/db/ingest-guide.ts). Dulu keduanya
// fungsi privat di dalam admin-docs.ts; dipindahkan ke sini supaya ingest tidak
// menyalin logikanya dan ikut menaikkan corpus_version - kalau tidak naik,
// cache guide_answers masih menyajikan jawaban lama untuk pertanyaan yang sama.

/**
 * Bangun ulang potongan satu artikel. Isi kosong = nol potongan, artinya topik
 * hilang dari pencarian tapi tetap ada di checklist.
 */
export async function rebuildChunks(articleId: string, content: string | null): Promise<number> {
  await db.delete(guideChunks).where(eq(guideChunks.articleId, articleId));
  const drafts = chunkMarkdown(content ?? "");
  if (drafts.length === 0) return 0;
  await db.insert(guideChunks).values(
    drafts.map((d) => ({
      articleId,
      ordinal: d.ordinal,
      heading: d.heading,
      pageFrom: d.pageFrom,
      pageTo: d.pageTo,
      text: d.text,
      textStemmed: stemmedText(d.text),
    })),
  );
  return drafts.length;
}

/**
 * corpus_version adalah kunci cache guide_answers: naik satu langkah setiap
 * korpus berubah, jadi jawaban lama berhenti dicocokkan tanpa ada yang dihapus.
 * chunker_version ditulis di sini juga supaya script ingest tahu potongan lama
 * mana yang perlu dibangun ulang kalau aturan pemotongan berubah.
 */
export async function bumpCorpusVersion(): Promise<void> {
  const [meta] = await db
    .insert(guideMeta)
    .values({ oneRow: true, corpusVersion: 1, chunkerVersion: CHUNKER_VERSION })
    .onConflictDoUpdate({
      target: guideMeta.oneRow,
      set: {
        corpusVersion: sql`${guideMeta.corpusVersion} + 1`,
        chunkerVersion: CHUNKER_VERSION,
        updatedAt: new Date(),
      },
    })
    .returning({ corpusVersion: guideMeta.corpusVersion });

  // Jawaban dari versi korpus lama tidak akan pernah dibaca lagi: kunci cache
  // memuat corpus_version (src/lib/guide-answer.ts), jadi barisnya cuma sampah.
  // Tanpa pembersihan ini guide_answers tumbuh satu set penuh setiap ingest.
  if (meta) {
    await db.delete(guideAnswers).where(lt(guideAnswers.corpusVersion, meta.corpusVersion));
  }
}
