// Prewarm cache jawaban guidebook (docs/Guidebook Maba.md, bagian "AI answer
// path"): pertanyaan FAQ dijawab sekali di sini supaya maba pertama yang
// menanyakannya tidak menunggu Groq. Kuota pengguna tidak dipakai -
// warmCacheForQuestion menulis lognya dengan user_id null.
//
// Jalankan: npx tsx --env-file=.env.local scripts/prewarm-guide.ts
//
// "skipped" bukan kegagalan: topiknya belum ditinjau pengurus atau belum punya
// potongan, jadi memang tidak boleh dijawab. Cache yang sudah hangat juga
// dilaporkan "cached".
import { GUIDE_FAQ } from "../src/lib/guidebook-faq";
import { warmCacheForQuestion } from "../src/lib/guide-answer";

async function main(): Promise<void> {
  for (const { question, topic } of GUIDE_FAQ) {
    const status = await warmCacheForQuestion(question);
    console.log(`${status}\t${question}\t(${topic})`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
