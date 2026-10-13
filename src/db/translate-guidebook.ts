// Terjemahan mesin Bahasa Indonesia -> Inggris untuk berkas panduan maba
// (docs/guidebook/*.md -> docs/guidebook/en/*.md). Isi Inggris ini dibaca
// ingest-guide.ts dan disimpan ke help_articles.content_en, lalu ditampilkan
// di /help waktu locale = en. Skrip ini idempoten: berkas yang sudah ada
// dilewati, jadi bisa dijalankan ulang untuk melengkapi topik baru saja.
//
// Run: npx tsx --env-file=.env.local src/db/translate-guidebook.ts
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { GUIDEBOOK_TOPICS } from "../lib/guidebook-manifest";
import { assistantChat } from "../lib/assistant";

const SYSTEM =
  "Kamu penerjemah profesional Bahasa Indonesia ke Bahasa Inggris untuk panduan mahasiswa baru di Nanjing, Tiongkok. " +
  "Terjemahkan seluruh teks markdown di bawah, pertahankan struktur markdown (## judul, - daftar, tabel, " +
  "[teks](url)) apa adanya. Pertahankan persis: angka, harga (mis. ¥30), tanggal, nama tempat (紫金山), nama aplikasi " +
  "(微信, 支付宝), dan istilah resmi. Jangan menambah, mengurangi, atau mengubah fakta sedikit pun. " +
  "Keluarkan HANYA markdown hasil terjemahan, tanpa kalimat pembuka atau penutup.";

async function main() {
  const outDir = path.join(process.cwd(), "docs/guidebook/en");
  mkdirSync(outDir, { recursive: true });

  for (const topic of GUIDEBOOK_TOPICS) {
    if (!topic.fileEn) continue;
    const dst = path.join(process.cwd(), topic.fileEn);
    if (existsSync(dst)) {
      console.log(`skip ${topic.slug} (sudah ada)`);
      continue;
    }
    const body = readFileSync(path.join(process.cwd(), topic.file), "utf8").trim();
    console.log(`terjemah ${topic.slug} (${body.length} ch)...`);
    const en = await assistantChat(
      [
        { role: "system", content: SYSTEM },
        { role: "user", content: body },
      ],
      { temperature: 0.2, maxTokens: 2200 },
    );
    writeFileSync(dst, en.trim() + "\n", "utf8");
    console.log(`  -> ${topic.fileEn} (${en.length} ch)`);
  }
  console.log("selesai");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
