// Harness chunker + renderer guidebook (docs/Guidebook Maba.md, fase P1).
//
// Dua bagian yang diuji di sini justru yang tidak bisa diuji lewat database:
// pemotongan markdown jadi guide_chunks, dan render markdown jadi React.
// Keduanya fungsi murni, jadi harness ini jalan tanpa env sama sekali.
//
// Jalankan: npm run check:guidebook
// Atau arahkan ke file hasil ekstraksi PDF:
//   npm run check:guidebook -- tmp/datalab-output-Guide_to_南京_2026.md
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { CHUNKER_VERSION, chunkMarkdown } from "../src/lib/guide-chunker";
import { renderMarkdownLite } from "../src/lib/markdown-lite";

const MAX_CHUNK_CHARS = 3200;

// Satu topik contoh yang menirukan hasil ekstraksi PDF: baris pemisah halaman,
// tabel, daftar bersarang, code fence berisi baris kosong, dan penanda inline.
const SAMPLE = [
  "{0}-----------------------------------------------",
  "# Panduan Maba",
  "",
  "Beberapa **kata penting**, `kode`, dan tautan [situs resmi](https://example.com).",
  "",
  "## 1. Sebelum Berangkat",
  "",
  "{1}-----------------------------------------------",
  "",
  "| Berkas | Jumlah |",
  "|---|---|",
  "| Paspor | 1 |",
  "| Visa | 1",
  "",
  "- Fotokopi KTP",
  "- Fotokopi KK",
  "  - dua lembar",
  "- Pas foto",
  "",
  "```bash",
  "npm install",
  "",
  "npm run build",
  "```",
  "",
  "## 2. Setelah Tiba",
  "",
  "Isi paragraf kedua di halaman berikutnya. [[p4]]",
  "",
  "### Catatan",
  "",
  "Selesai.",
].join("\n");

type Check = { name: string; ok: boolean; detail?: string };
const checks: Check[] = [];
const check = (name: string, ok: boolean, detail?: string) => checks.push({ name, ok, detail });

function render(md: string): string {
  try {
    return renderToStaticMarkup(renderMarkdownLite(md));
  } catch (e) {
    return `THREW: ${(e as Error).message}`;
  }
}

// ---------- chunker ----------
const chunks = chunkMarkdown(SAMPLE);
const textOf = (needle: string) => chunks.find((c) => c.text.includes(needle));

check("chunker: menghasilkan potongan", chunks.length > 0, `${chunks.length} potongan`);
check(
  "chunker: ordinal berurutan dari 0",
  chunks.every((c, n) => c.ordinal === n),
);
check(
  "chunker: tidak ada potongan kosong",
  chunks.every((c) => c.text.trim() !== ""),
);
check(
  `chunker: tiap potongan <= ${MAX_CHUNK_CHARS} karakter`,
  chunks.every((c) => c.text.length <= MAX_CHUNK_CHARS),
  `terpanjang ${Math.max(...chunks.map((c) => c.text.length))}`,
);

const tableChunk = textOf("| Paspor |");
check(
  "chunker: tabel utuh dalam satu potongan",
  !!tableChunk && tableChunk.text.includes("| Berkas |") && tableChunk.text.includes("| Visa |"),
);
check("chunker: heading bagian terbawa", tableChunk?.heading === "1. Sebelum Berangkat", tableChunk?.heading ?? "-");

const fenceChunk = textOf("npm install");
check(
  "chunker: code fence tidak dipotong di baris kosong",
  !!fenceChunk && fenceChunk.text.includes("npm run build") && fenceChunk.text.includes("```"),
);

check(
  "chunker: baris pemisah halaman dibuang dari teks",
  chunks.every((c) => !/^\{\d+\}-{3,}/m.test(c.text)),
);
check(
  "chunker: halaman awal diambil dari penanda {N}",
  textOf("# Panduan Maba")?.pageFrom === 0,
  String(textOf("# Panduan Maba")?.pageFrom),
);
check(
  "chunker: penanda inline [[p4]] menaikkan halaman akhir",
  textOf("Isi paragraf kedua")?.pageTo === 4,
  String(textOf("Isi paragraf kedua")?.pageTo),
);
check("chunker: CHUNKER_VERSION terisi", Number.isInteger(CHUNKER_VERSION) && CHUNKER_VERSION >= 1);

// ---------- renderer: markdown setengah jadi tidak boleh melempar ----------
const broken = render(["| a | b |", "|---|---|", "| 1 | 2", "", "##", "", "```js", "const a = 1;"].join("\n"));
check("renderer: markdown setengah jadi tidak melempar", !broken.startsWith("THREW"), broken.slice(0, 80));
check("renderer: tabel tanpa pipa penutup tetap jadi tabel", broken.includes("<table"));
check("renderer: code fence tanpa penutup tetap jadi blok kode", broken.includes("<pre"));
check("renderer: heading kosong jadi teks apa adanya", broken.includes("##"));
check("renderer: penanda [[p12]] yang terhapus jadi teks biasa", render("Halaman [[p12]] kosong.").includes("[[p12]]"));
check("renderer: baris {N} jadi pemisah, bukan teks", render("{3}-----").includes("<hr"));

const rich = render(SAMPLE);
check("renderer: heading, tabel, daftar, kode terbentuk", /<h1|<table|<ul|<pre/.test(rich));
check("renderer: daftar bersarang", (rich.match(/<ul/g) ?? []).length >= 2, `${(rich.match(/<ul/g) ?? []).length} <ul`);
check("renderer: tautan aman jadi <a>", rich.includes('href="https://example.com"'));

// ---------- renderer: isi artikel tidak boleh bisa menyuntik HTML ----------
const injected = render('<b>tebal</b> <script>alert(1)</script> dan [x](javascript:alert)');
check("renderer: HTML mentah tidak dieksekusi", !injected.includes("<script"));
check("renderer: HTML mentah tampil sebagai teks", injected.includes("&lt;script&gt;"));
check("renderer: tautan javascript: tidak jadi href", !injected.includes("href="));
check("renderer: tautan javascript: tampil sebagai teks", injected.includes("[x](javascript:alert)"));

// ---------- opsional: jalankan chunker atas file nyata ----------
const path = process.argv[2];
if (path) {
  const md = readFileSync(path, "utf8");
  const real = chunkMarkdown(md);
  console.log(`\n${path}`);
  console.log(
    `  ${real.length} potongan, terpanjang ${Math.max(...real.map((c) => c.text.length))} karakter, ` +
      `halaman ${real[0]?.pageFrom ?? "-"}-${real[real.length - 1]?.pageTo ?? "-"}`,
  );
  const headings: string[] = [];
  for (const c of real) if (c.heading && !headings.includes(c.heading)) headings.push(c.heading);
  console.log(`  ${headings.length} heading:`);
  for (const h of headings.slice(0, 12)) console.log(`    - ${h}`);
  if (headings.length > 12) console.log(`    ... ${headings.length - 12} lagi`);
}

// ---------- laporan ----------
for (const c of checks) console.log(`${c.ok ? "ok  " : "FAIL"} ${c.name}${c.detail && !c.ok ? ` -> ${c.detail}` : ""}`);
const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} ok`);
process.exit(failed.length ? 1 : 0);
