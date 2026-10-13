// Ingest guidebook maba (docs/Guidebook Maba.md, fase P2): markdown di
// docs/guidebook/ -> help_articles + guide_chunks.
//
// Aturan tulisnya mengikuti pembagian di skema: `parsedMarkdown` = versi sumber
// yang baru masuk (baseline panel merge), `content` = versi yang disunting
// pengurus. Jadi `content` hanya ditimpa kalau barisnya masih kosong, kalau
// topiknya ditandai replaceStub (isinya baru penanda halaman ekstraksi), atau
// kalau kamu menulis --force. Baris yang sudah disunting pengurus cuma
// diperbarui metadatanya, supaya ingest tidak menelan pekerjaan mereka.
//
// Run with:
//   npx tsx --env-file=.env src/db/ingest-guide.ts                    # semua topik
//   npx tsx --env-file=.env src/db/ingest-guide.ts kota-nanjing       # satu topik
//   npx tsx --env-file=.env src/db/ingest-guide.ts --force kota-nanjing
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { helpArticles } from "./schema";
import { GUIDEBOOK_TOPICS } from "../lib/guidebook-manifest";
import { bumpCorpusVersion, rebuildChunks } from "../lib/guidebook-index";

const args = process.argv.slice(2);
const force = args.includes("--force");
const wanted = args.filter((arg) => !arg.startsWith("--"));

async function main() {
  if (wanted.length > 0) {
    const unknown = wanted.filter((slug) => !GUIDEBOOK_TOPICS.some((topic) => topic.slug === slug));
    if (unknown.length > 0) throw new Error(`Slug tidak dikenal: ${unknown.join(", ")}`);
  }
  const topics = wanted.length > 0 ? GUIDEBOOK_TOPICS.filter((topic) => wanted.includes(topic.slug)) : GUIDEBOOK_TOPICS;

  let touched = 0;
  let chunkCount = 0;

  for (const topic of topics) {
    const body = readFileSync(path.join(process.cwd(), topic.file), "utf8").trim();
    if (body.length === 0) throw new Error(`${topic.file} kosong`);

    // Terjemahan Inggris opsional: kalau berkasnya belum ada, kolomnya null dan
    // halaman /help jatuh ke teks Indonesia. Berbeda dari `content`, isi Inggris
    // selalu ditimpa saat ada berkasnya - ini hasil terjemahan mesin, bukan
    // suntingan pengurus, jadi tidak perlu panel merge.
    const enPath = topic.fileEn ? path.join(process.cwd(), topic.fileEn) : null;
    const bodyEn = enPath && existsSync(enPath) ? readFileSync(enPath, "utf8").trim() : null;

    const [existing] = await db
      .select({ id: helpArticles.id, content: helpArticles.content })
      .from(helpArticles)
      .where(eq(helpArticles.slug, topic.slug));

    const metadata = {
      title: topic.title,
      section: topic.section,
      phase: topic.phase,
      sortOrder: topic.sortOrder,
      sourceLabel: topic.sourceLabel,
      sourceDocSlug: topic.sourceDocSlug,
      parsedMarkdown: body,
      updatedAt: new Date(),
      titleEn: topic.titleEn ?? null,
      sectionEn: topic.sectionEn ?? null,
      contentEn: bodyEn,
    };

    if (!existing) {
      const [created] = await db
        .insert(helpArticles)
        .values({ slug: topic.slug, ...metadata, content: body, isPublic: topic.isPublic })
        .returning({ id: helpArticles.id });
      chunkCount += await rebuildChunks(created.id, body);
      touched += 1;
      console.log(`+ ${topic.slug}: dibuat (${body.length} karakter, publik=${topic.isPublic})`);
      continue;
    }

    const empty = (existing.content ?? "").trim().length === 0;
    const replace = force || empty || topic.replaceStub === true;
    await db
      .update(helpArticles)
      .set(replace ? { ...metadata, content: body } : metadata)
      .where(eq(helpArticles.id, existing.id));

    if (replace) {
      chunkCount += await rebuildChunks(existing.id, body);
      const why = force ? "--force" : empty ? "isi lama kosong" : "isi lama masih stub";
      console.log(`~ ${topic.slug}: konten diganti (${why}), ${body.length} karakter`);
    } else {
      console.log(`~ ${topic.slug}: metadata saja, suntingan pengurus dibiarkan`);
    }
    touched += 1;
  }

  // corpus_version adalah kunci cache jawaban chatbot: tanpa naik, pertanyaan
  // yang sama masih dilayani jawaban lama.
  await bumpCorpusVersion();
  console.log(`selesai: ${touched} topik, ${chunkCount} potongan pencarian, corpus_version naik 1`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
