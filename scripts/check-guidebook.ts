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
import { MAX_CHUNK_CHARS_TOTAL, WINDOW_GAP, buildCorpusVocabulary, correctQuestionTypo, correctTypo, excerpt, orderByRank, questionEntities, searchTerms, windowAroundTerms } from "../src/lib/guidebook-terms";
import { annotateHanziPinyin } from "../src/lib/pinyin";

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

// ---------- kata kunci pertanyaan ----------
// Bagian yang paling gampang rusak diam-diam: pengguna bertanya dalam bahasa
// Inggris, artikelnya bahasa Indonesia. Kalau sinonimnya putus, chatbot hanya
// menjawab "belum ada panduan" dan tidak ada yang error.
const airportTerms = searchTerms("how to NUAA from airport");
check(
  "kata kunci: pertanyaan Inggris dapat istilah Indonesia",
  airportTerms.includes("nuaa") && airportTerms.includes("bandara"),
  airportTerms.join(","),
);
check(
  "kata kunci: sinonim tidak menendang kata asli pengguna",
  airportTerms.indexOf("nuaa") < airportTerms.indexOf("bandara"),
  airportTerms.join(","),
);
const visaTerms = searchTerms("how is the visa work?");
check(
  "kata kunci: kata fungsi Inggris dibuang, isi pertanyaan tetap",
  visaTerms.includes("visa") && visaTerms.includes("kerja") && !visaTerms.some((t) => ["is", "the", "how"].includes(t)),
  visaTerms.join(","),
);
check(
  "kata kunci: kata kunci dibatasi",
  searchTerms("bagaimana cara mengurus visa paspor asrama kampus bank rekening telepon internet").length <= 10,
);
const entityTerms = searchTerms("where is nanjing at?");
check(
  "kata kunci: pertanyaan entitas tidak menyisakan kata kunci",
  entityTerms.length === 0,
  entityTerms.join(","),
);
check(
  "kata kunci: entitas dikenali untuk pencarian cadangan",
  questionEntities("where is nanjing at?").join(",") === "nanjing",
  questionEntities("where is nanjing at?").join(","),
);
check(
  "kata kunci: sapaan tidak jadi kata kunci",
  searchTerms("halo kak").length === 0,
  searchTerms("halo kak").join(","),
);
const mosqueTerms = searchTerms("masjid di Nanjing di mana saja?");
check(
  "kata kunci: kata tanya Indonesia tidak jadi kata kunci",
  mosqueTerms.join(",") === "masjid",
  mosqueTerms.join(","),
);

// ---------- koreksi salah ketik ----------
// Kosakatanya dari korpus, bukan kamus umum: yang boleh jadi koreksi cuma kata
// yang benar-benar ada di artikel. Fungsi murni, jadi diuji di sini - jalur
// pemanggilannya (findGuideChunks) butuh database, diukur di
// src/db/eval-guidebook.ts lewat grup "salah ketik".
const vocab = buildCorpusVocabulary([
  "Masjid di Nanjing: Jingjue Mosque. Makanan khas Nanjing enak.",
  "Emergency numbers work from any phone in China. Tiongkok punya nomor penting.",
  "Bakar sampah dilarang di asrama. Jam malam mulai jam sebelas.",
]);
check("koreksi: huruf tertukar dibetulkan", correctTypo("toingkok", vocab) === "tiongkok", String(correctTypo("toingkok", vocab)));
check("koreksi: huruf hilang dibetulkan", correctTypo("emrgency", vocab) === "emergency", String(correctTypo("emrgency", vocab)));
check("koreksi: huruf berlebih dibetulkan", correctTypo("makanann", vocab) === "makanan", String(correctTypo("makanann", vocab)));
check("koreksi: kata pendek tidak ditebak", correctTypo("kos", vocab) === undefined, String(correctTypo("kos", vocab)));
// Kata di bawah lima huruf hanya dikoreksi kalau hurufnya tertukar DAN
// tebakannya tunggal. "kso" cuma bisa jadi "kos"; "buy" satu huruf dari "bus",
// dan substitusi begitu tidak boleh dipakai - pernah bikin pertanyaan belanja
// menarik artikel transportasi.
const shortTypos = buildCorpusVocabulary(["Sewa kos di sekitar kampus.", "Bus 37 lewat gerbang kampus."]);
check("koreksi: huruf tertukar di kata pendek dibetulkan", correctTypo("kso", shortTypos) === "kos", String(correctTypo("kso", shortTypos)));
check("koreksi: substitusi di kata pendek tidak ditebak", correctTypo("buy", shortTypos) === undefined, String(correctTypo("buy", shortTypos)));
// Dua tebakan huruf tertukar sama-sama ada di korpus: tetap tidak menebak.
const shortAmbiguous = buildCorpusVocabulary(["Sko jauh dari kos."]);
check("koreksi: kata pendek bersaing tetap tidak ditebak", correctTypo("kso", shortAmbiguous) === undefined, String(correctTypo("kso", shortAmbiguous)));
check("koreksi: kata yang sudah ada tidak disentuh", correctTypo("masjid", vocab) === undefined, String(correctTypo("masjid", vocab)));
check("koreksi: kata di luar jangkauan tidak dipaksa", correctTypo("yikatong", vocab) === undefined, String(correctTypo("yikatong", vocab)));
// Dua kandidat sama-sama masuk akal -> tidak menebak. Ini yang menahan bot
// mengutip artikel yang salah, dan lewat eval jaga terhadap penolakan palsu.
const ambiguous = buildCorpusVocabulary(["Bakar sampah dilarang.", "Bakal ada pemeriksaan kamar."]);
check("koreksi: kandidat seri tidak ditebak", correctTypo("bakau", ambiguous) === undefined, String(correctTypo("bakau", ambiguous)));
// Kandidat yang lebih sering muncul di korpus menang.
const frequent = buildCorpusVocabulary(["Bakar sampah dilarang.", "Bakar kayu tidak boleh.", "Bakal ada pemeriksaan kamar."]);
check("koreksi: kandidat tersering menang", correctTypo("bakau", frequent) === "bakar", String(correctTypo("bakau", frequent)));
check(
  "koreksi: koreksi yang jatuh ke entitas tetap dipakai",
  correctQuestionTypo("masjid naning apa itu?", vocab) === "masjid nanjing apa itu?",
  String(correctQuestionTypo("masjid naning apa itu?", vocab)),
);
check("koreksi: tanpa perubahan tidak ada pertanyaan baru", correctQuestionTypo("masjid di Nanjing", vocab) === undefined, String(correctQuestionTypo("masjid di Nanjing", vocab)));
check(
  "koreksi: huruf besar awal kata diikuti",
  correctQuestionTypo("Mkanan khas nanjing apa?", vocab) === "Makanan khas nanjing apa?",
  String(correctQuestionTypo("Mkanan khas nanjing apa?", vocab)),
);
check(
  "koreksi: beberapa kata dalam satu pertanyaan",
  correctQuestionTypo("emrgency dan toingkok?", vocab) === "emergency dan tiongkok?",
  String(correctQuestionTypo("emrgency dan toingkok?", vocab)),
);

// ---------- jendela isi artikel ----------
// Artikel panjang dipotong 1800 karakter sebelum dikirim ke model. Bagian yang
// menjawab pertanyaan sering ada di bawah, dan kalau potongannya selalu dari
// atas, jawabannya jadi "panduannya tidak memuat itu" - penolakan yang salah
// tapi terdengar benar.
const head = "# Packing\n\nPack for two weeks.\n";
const longBody = head + "isi netral. ".repeat(260) + "\n## Kirim Barang Pintu ke Pintu\n\nKirim koper lewat jasa pintu ke pintu.\n";
const windowed = windowAroundTerms(longBody, ["kirim"]);
check(
  "jendela: artikel pendek tidak dipotong",
  windowAroundTerms("pendek saja", ["kirim"]) === "pendek saja",
);
check(
  "jendela: bagian yang cocok ikut terkirim",
  windowed.includes("Kirim Barang Pintu ke Pintu") && windowed.length <= 1800,
  `${windowed.length} karakter`,
);
check(
  "jendela: tanpa kata kunci tetap dari awal artikel",
  windowAroundTerms(longBody, ["tidakada"]).startsWith("# Packing"),
);
// Satu artikel sering menyimpan dua fakta yang menjawab pertanyaan yang sama di
// dua bagian berjauhan - denda di daftar sanksi, batas hari lapor di bagian
// administrasi. Jendela pertama hanya menangkap satu di antaranya, jadi baris
// terbaik di luar jendela pertama dikirim sebagai jendela kedua.
const pad = Array.from(
  { length: 40 },
  (_, i) => `- Catatan izin tinggal nomor ${i} untuk mengisi bagian pertama artikel ini.`,
).join("\n");
const twoRegions = [
  "## Masa Berlaku",
  "",
  "- Visa dan izin tinggal punya masa berlaku yang dihitung sejak tanggal kedatangan.",
  pad,
  "",
  "## Sanksi",
  "",
  "- Kalau dianggap berat, denda 500 RMB per hari masa tinggal ilegal.",
].join("\n");
const twoWindows = windowAroundTerms(twoRegions, ["visa", "masa berlaku", "denda", "masa tinggal"]);
check(
  "jendela: fakta di bagian lain ikut terkirim",
  twoWindows.includes("masa berlaku yang dihitung") && twoWindows.includes("500 RMB per hari"),
  `${twoWindows.length} karakter`,
);
const split = twoWindows.split(WINDOW_GAP);
const firstLines = new Set(split[0].split("\n"));
const overlap = split[1]?.split("\n").filter((line) => line !== "" && firstLines.has(line)) ?? [];
check(
  "jendela: jendela kedua tidak menumpuk jendela pertama",
  split.length === 2 && overlap.length === 0,
  overlap[0] ?? `${split.length} jendela`,
);
check(
  "jendela: jatah dua jendela tidak dilampaui",
  twoWindows.length <= MAX_CHUNK_CHARS_TOTAL,
  `${twoWindows.length} / ${MAX_CHUNK_CHARS_TOTAL} karakter`,
);
check(
  "jendela: artikel satu bagian tidak dapat jendela kedua",
  !windowed.includes(WINDOW_GAP) && windowed.length <= 1800,
  `${windowed.length} karakter`,
);
// Dua kata kunci di satu baris yang salah satunya cuma varian kata kunci lain
// ("laku" pada baris yang juga memuat "dilakukan") dihitung satu, bukan dua.
// Fixture ini menaruh baris "Pemeriksaan dilakukan lagi ..." (dua varian, satu
// topik) lebih dekat ke jendela pertama daripada judul "## Registrasi … Batas 24
// Jam" (dua kata kunci berbeda) dan menjauhkannya dengan paragraf pengisi: aturan
// skor mentah memilih baris varian dan jendela keduanya berhenti sebelum batas 24
// jam, aturan varian memilih judul bagiannya.
const variantBody = [
  "## Awal",
  "",
  "- Pemeriksaan dilakukan di negara asal sebelum berangkat.",
  pad,
  "",
  "- Pemeriksaan dilakukan lagi di kantor polisi terdekat, tanpa aplikasi.",
  pad,
  "",
  "## Registrasi 住宿登记: Batas 24 Jam",
  "",
  "- Batas waktunya 24 jam sejak kedatangan dan sama di semua jalur.",
].join("\n");
const variantWindows = windowAroundTerms(variantBody, ["registrasi", "jam", "dilakukan", "laku"]);
const variantSplit = variantWindows.split(WINDOW_GAP);
check(
  "jendela: varian satu kata kunci tidak mengalahkan dua kata kunci berbeda",
  variantSplit.length === 2 &&
    variantSplit[1].includes("24 jam") &&
    !variantSplit[1].includes("tanpa aplikasi"),
  `${variantWindows.length} karakter, ${variantSplit.length} jendela`,
);
// Varian pendek tetap dihitung kalau varian panjangnya tidak ada di baris itu:
// "- Izin ini berlaku 30 hari." cocok "izin" saja dan tetap jadi baris kandidat
// jendela kedua, bukan baris tanpa kata kunci.
const loneVariantWindows = windowAroundTerms(
  ["## Visa", "", "- Izin tinggal diajukan setelah tiba.", pad, "", "- Izin ini berlaku 30 hari."].join("\n"),
  ["izin tinggal", "izin"],
);
check(
  "jendela: varian pendek berdiri sendiri tetap jadi kandidat",
  loneVariantWindows.split(WINDOW_GAP).length === 2 && loneVariantWindows.includes("30 hari"),
  `${loneVariantWindows.length} karakter`,
);
// Tidak ada satu kata kunci pun di luar jendela pertama: jatah jendela kedua
// tidak dipakai sama sekali, keluarannya sama seperti sebelum aturan ini ada.
// Kata kuncinya ada di baris pertama, jadi tidak ada judul bagian di atasnya yang
// ikut jadi kandidat jendela kedua.
const coveredWindows = windowAroundTerms(
  ["- Visa pelajar diajukan setelah pendaftaran selesai.", pad, "", pad].join("\n"),
  ["visa", "pendaftaran"],
);
check(
  "jendela: tanpa kata kunci di luar jendela pertama tetap satu jendela",
  !coveredWindows.includes(WINDOW_GAP) && coveredWindows.length <= 1800,
  `${coveredWindows.length} karakter`,
);

// ---------- pinyin di jalur render ----------

// Bentuknya dipakai di jawaban chatbot dan isi artikel /help, jadi ia ikut
// menentukan apa yang dibaca maba. Yang gampang rusak: kurung dobel waktu
// sumbernya sudah menulis hanzi di dalam kurung sendiri.
const plainHanzi = annotateHanziPinyin("Naik 地铁 ke 新街口.");
check(
  "pinyin: hanzi dibungkus bentuk ({hanzi} - {pinyin})",
  plainHanzi.includes("(地铁 - dì tiě)") && plainHanzi.includes("(新街口 - xīn jiē kǒu)"),
  plainHanzi,
);
check("pinyin: teks tanpa hanzi tidak berubah", annotateHanziPinyin("tanpa hanzi") === "tanpa hanzi");
const parenHanzi = annotateHanziPinyin("ibu kota Provinsi Jiangsu (江苏) di Tiongkok");
check("pinyin: kurung sumber tidak bikin kurung dobel", parenHanzi.includes("(江苏 - jiāng sū)") && !parenHanzi.includes("(("), parenHanzi);
const curlyHanzi = annotateHanziPinyin("pakai （支付宝） untuk bayar");
check("pinyin: kurung lebar pun dilepas", curlyHanzi === "pakai (支付宝 - zhī fù bǎo) untuk bayar", curlyHanzi);
const mixedHanzi = annotateHanziPinyin("床上用品（三件套 or 四件套）");
check(
  "pinyin: tiap run hanzi dapat pinyin sendiri, kata campuran tidak ikut",
  mixedHanzi.includes("(三件套 - sān jiàn tào)") && mixedHanzi.includes("(四件套 - sì jiàn tào)") && mixedHanzi.includes(" or "),
  mixedHanzi,
);

// ---------- urutan daftar "panduan yang paling relevan" ----------
// Baris potongan datang dari DB urut help_articles.sort_order (urutan tampilan
// konsol). Daftar yang diklaim "paling relevan" harus dibaca urut skor, kalau
// tidak artikel yang paling cocok muncul di posisi terakhir atau hilang sama
// sekali saat pemotongan tiga artikel menyentuhnya.
const rankedRows = orderByRank(
  [
    { slug: "nomor-penting", ordinal: 4 },
    { slug: "profil-nanjing", ordinal: 0 },
    { slug: "profil-nanjing", ordinal: 3 },
    { slug: "aplikasi-bayar", ordinal: 7 },
    { slug: "profil-tiongkok", ordinal: 1 },
  ],
  ["profil-nanjing", "profil-tiongkok", "nomor-penting"],
  (row) => row.slug,
);
check(
  "urutan: baris mengikuti skor, ordinal jadi pemecah seri",
  rankedRows.map((r) => `${r.slug}#${r.ordinal}`).join(",") ===
    "profil-nanjing#0,profil-nanjing#3,profil-tiongkok#1,nomor-penting#4,aplikasi-bayar#7",
  rankedRows.map((r) => `${r.slug}#${r.ordinal}`).join(","),
);
const cachedRows = orderByRank(
  [{ id: "c", ordinal: 0 }, { id: "a", ordinal: 1 }, { id: "b", ordinal: 2 }],
  ["b", "a"],
  (row) => row.id,
);
check(
  "urutan: id cache dipulihkan ke urutan saat ditulis",
  cachedRows.map((r) => r.id).join("") === "bac",
  cachedRows.map((r) => r.id).join(""),
);

// ---------- partikel tanya "-kah" ----------
// "adakah masjid di nanjing?" pernah dijawab "belum ada panduan" padahal
// artikelnya ada: "adakah" ikut jadi kata kunci, dan pertanyaan dua kata harus
// cocok semua, jadi kata yang tidak pernah ada di teks artikel menuntut
// kecocokan yang tidak mungkin.
const adakahTerms = searchTerms("adakah masjid di nanjing?");
check(
  'partikel: "adakah" tidak jadi kata kunci',
  adakahTerms.join(",") === "masjid",
  adakahTerms.join(","),
);
const dimanakahTerms = searchTerms("dimanakah masjid di Nanjing?");
check(
  'partikel: "dimanakah" tidak jadi kata kunci',
  dimanakahTerms.join(",") === "masjid",
  dimanakahTerms.join(","),
);
const mahalKah = searchTerms("mahalkah kos di Nanjing?");
check(
  "partikel: kata isi tetap dicari tanpa partikelnya",
  mahalKah.includes("mahal") && mahalKah.includes("kos") && !mahalKah.includes("mahalkah"),
  mahalKah.join(","),
);
check(
  'partikel: kata tanpa partikel tidak berubah',
  searchTerms("ada di mana masjid").includes("masjid"),
  searchTerms("ada di mana masjid").join(","),
);

// ---------- paragraf jawaban cadangan ----------
// Jawaban cadangan diratakan jadi satu paragraf sebelum dirender. Kalau penanda
// blok markdown ikut terbawa, renderer membaca seluruh potongan sebagai satu
// heading raksasa ("SOURCE THE GUIDEBOOK ... ## MOSQUE - (净觉寺 ...").
const mosqueExcerpt = excerpt(
  '## Source\n\nThe guidebook "A Guide to Nanjing" contains a list of mosques.\n\n## Mosque\n\n- **净觉寺 Jingjue Mosque** — Sanshan Street.\n',
);
check(
  "ringkasan: penanda heading dan butir dibuang",
  mosqueExcerpt ===
    'Source The guidebook "A Guide to Nanjing" contains a list of mosques. Mosque **净觉寺 Jingjue Mosque** — Sanshan Street.',
  mosqueExcerpt,
);
const longExcerpt = excerpt(" ".repeat(0) + "kata ".repeat(100));
check(
  "ringkasan: dipotong di batas kata, diakhiri elipsis",
  longExcerpt.length <= 224 && longExcerpt.endsWith("...") && !longExcerpt.includes("  "),
  longExcerpt,
);
check(
  "ringkasan: kutipan blok ikut dibuang",
  excerpt("> Simpan nomor ini\n\nNanjing, 4 nomor.") === "Simpan nomor ini Nanjing, 4 nomor.",
  excerpt("> Simpan nomor ini\n\nNanjing, 4 nomor."),
);

// ---------- laporan ----------
for (const c of checks) console.log(`${c.ok ? "ok  " : "FAIL"} ${c.name}${c.detail && !c.ok ? ` -> ${c.detail}` : ""}`);
const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} ok`);
process.exit(failed.length ? 1 : 0);
