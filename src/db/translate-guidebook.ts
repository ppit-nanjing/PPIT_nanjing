// Terjemahan mesin Bahasa Indonesia -> Inggris untuk berkas panduan maba
// (docs/guidebook/*.md -> docs/guidebook/en/*.md). Isi Inggris ini dibaca
// ingest-guide.ts dan disimpan ke help_articles.content_en, lalu ditampilkan
// di /help waktu locale = en. Skrip ini idempoten: berkas yang sudah ada
// dilewati, jadi bisa dijalankan ulang untuk melengkapi topik baru saja.
//
// Terjemahan dipecah per bagian `## `. Artikel utuh pernah ditulis terpotong:
// satu panggilan dengan maxTokens 2200 kehabisan kuota keluaran di tengah
// kalimat, dan potongan itu ikut tertulis tanpa peringatan. Per bagian,
// keluaran satu panggilan jauh di bawah batas, dan panjang hasilnya diperiksa
// sebelum ditulis.
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

/** Satu bagian `## ` - keluaran satu panggilan, dengan pagar panjang minimum. */
async function translateSection(section: string): Promise<string> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const en = (
      await assistantChat(
        [
          { role: "system", content: SYSTEM },
          { role: "user", content: section },
        ],
        { temperature: 0.2, maxTokens: 2200 },
      )
    ).trim();
    if (en.length >= section.length * 0.5) return en;
    lastError = new Error(`terjemahan terlalu pendek (${en.length}/${section.length} ch)`);
  }
  throw lastError;
}

/** Terjemah artikel per bagian, digabung kembali dengan urutan yang sama. */
async function translateBody(body: string): Promise<string> {
  const parts = body.split(/^(?=## )/m).filter((part) => part.trim().length > 0);
  const out: string[] = [];
  for (const part of parts) out.push(await translateSection(part));
  return out.join("\n\n");
}

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
    const en = await translateBody(body);
    writeFileSync(dst, en + "\n", "utf8");
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
