// Kartu tempat di bawah gelembung jawaban chatbot: satu kartu per tempat yang
// jawaban itu sebut, dan nama, keterangan, serta tautan tiap kartu dibaca dari
// baris korpusnya, bukan dari teks jawaban - model sering melepas atau menulis
// ulang tautannya.
// Murni string -> data, tanpa DOM dan tanpa dependensi baru.

export type ChatPlace = { label: string; detail: string; url: string };

/** Baris korpus: nama tempat ditulis tebal di awal butir daftar. */
const PLACE_LINE = /^\s*[-*]\s+\*\*(.+?)\*\*/;
/** Tautan markdown `[label](url)` di baris yang sama. */
const MD_LINK = /\[[^\]\n]*\]\(([^)\s]+)\)/g;
/** Versi tanpa grup tangkap: tautannya dibuang dari keterangan kartu. */
const MD_LINK_ANY = /\[[^\]\n]*\]\([^)\s]+\)/g;
/** Kurung yang tinggal kosong sesudah tautannya dibuang, mis. "(Buka di Amap)". */
const EMPTY_PARENS = /[([][\s,;:]*[)\]]/g;
/** Panjang keterangan satu kartu: satu baris pendek, bukan alamat lengkap. */
const MAX_DETAIL = 120;
/** Sisa baris sesudah tautannya dibuang dan tanda pisahnya dilepas. */
function detailFrom(line: string, labelEnd: number): string {
  const rest = line
    .slice(labelEnd)
    .replace(MD_LINK_ANY, "")
    .replace(EMPTY_PARENS, " ")
    // Catatan nama Amap "(Amap: 草桥寺)" bukan isi kartu: yang tampil alamatnya.
    .replace(/^[\s—–\-:]*\([^()]*\)\s*/, "")
    .replace(/^[\s—–\-:]+/, "")
    .replace(/\s+/g, " ")
    .trim();
  if (rest.length <= MAX_DETAIL) return rest;
  const cut = rest.slice(0, MAX_DETAIL);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > MAX_DETAIL / 2 ? cut.slice(0, lastSpace) : cut).trimEnd()}...`;
}
/** Rangkaian huruf Han pertama: nama Tionghoa tempat itu. */
const HAN_RUN = /\p{Script=Han}+/u;
/** Rangkaian kata Latin pertama: nama romanisasinya. */
const LATIN_RUN = /[A-Za-z][A-Za-z0-9'’.-]*(?:\s+[A-Za-z][A-Za-z0-9'’.-]*)*/;
/** Penanda tebal/miring di dalam label dibuang, sisanya teks apa adanya. */
const EMPHASIS = /[*_`]/g;
/**
 * Tautan Amap yang boleh jadi tautan kartu: halaman POI (`amap.com/place/<id>`)
 * atau pencarian kata kunci (`uri.amap.com/search?keyword=…&city=…`). Baris
 * korpus yang halaman POI-nya belum ketemu tetap dapat kartu lewat tautan
 * pencarian - rutenya membuka hasil pencarian nama tempat itu di Amap, bukan
 * mengarang koordinat. Tautan non-Amap tetap ditolak.
 */
const AMAP_HREF = /^https?:\/\/(?:[\w-]+\.)*amap\.com\/(?:place\/[\w-]+|search\/?\?)/i;
/** Panjang satu baris indeks: nama + klausa transit, bukan alamat lengkap. */
const MAX_INDEX = 90;
/** Klausa transit di baris korpus: "Bus ..." atau "Metro: ...". */
const TRANSIT = /\b(?:Bus|Metro)\b/i;
/** Batas baris indeks satu artikel: cukup untuk satu topik tempat (±12). */
const MAX_INDEX_ROWS = 12;
/** Judul bagian `##` yang sedang dipindai; isinya penanda bagian baris indeks. */
const HEADING = /^#{2,6}\s+(.+)/;
/** Bagian tempat di luar kota: "Masjid di luar kota Nanjing", "Mosques outside ...". */
const SECTION_OUTSIDE = /\bluar kota\b|\boutside\b/i;
/** Bagian tempat di dalam kota: "Masjid di kota Nanjing", "Mosques in Nanjing city". */
const SECTION_INSIDE = /\bdi kota\b|\bin\b.*\bcity\b/i;

/**
 * Nama yang dipakai untuk mengenali tempat di dalam teks jawaban. Dua-duanya
 * diambil dari penanda tebalnya: hanzi pertama (jawaban berbahasa Indonesia
 * sering menulis 净觉寺) dan rangkaian Latin pertama (jawaban Inggris menulis
 * Jingjue Mosque). Bagian dalam tanda kurung sengaja tidak dipakai - kata
 * umum seperti "清真寺" di situ akan cocok dengan hampir semua jawaban.
 */
function placeKeys(label: string): string[] {
  const keys: string[] = [];
  const han = label.match(HAN_RUN)?.[0];
  if (han) keys.push(han);
  const latin = label.match(LATIN_RUN)?.[0]?.trim().toLowerCase();
  if (latin) keys.push(latin);
  return keys;
}

/** Posisi kemunculan paling awal dari salah satu nama tempat, -1 kalau tidak ada. */
function firstMention(haystack: string, keys: string[]): number {
  let best = -1;
  for (const key of keys) {
    const found = haystack.indexOf(key);
    if (found === -1) continue;
    if (best === -1 || found < best) best = found;
  }
  return best;
}

/**
 * Kartu tempat untuk satu jawaban: `chunks` = teks potongan artikel panduan
 * yang ikut terambil, `reply` = teks jawaban mentah yang akan ditampilkan.
 * Urutannya urutan kemunculan nama di dalam jawaban, bukan urutan retrieval.
 * Tempat yang disebut jawaban tapi barisnya tidak memuat tautan tidak dapat
 * kartu: tidak ada tautan yang boleh dikarang. Keterangannya pun diambil dari
 * baris korpus yang sama, jadi tidak ada alamat yang dikarang model.
 */
export function placeButtons(chunks: string, reply: string, max = 6): ChatPlace[] {
  const haystack = reply.toLowerCase();
  const used = new Set<string>();
  const hits: { place: ChatPlace; at: number; order: number }[] = [];
  let order = 0;

  for (const line of chunks.split("\n")) {
    const match = PLACE_LINE.exec(line);
    const label = match?.[1]?.replace(EMPHASIS, "").trim();
    if (!label || !match) continue;
    // Satu baris = satu tempat, dan tautannya tautan tempat itu. Halaman POI
    // maupun tautan pencarian Amap sama-sama dipakai; tautan lain tidak
    // menghasilkan kartu, dan tempatnya tetap terjawab di teks jawaban.
    const links = [...line.matchAll(MD_LINK)].map((link) => link[1]);
    const url = links.find((href) => AMAP_HREF.test(href));
    if (!url || used.has(url)) continue;
    const at = firstMention(haystack, placeKeys(label));
    if (at === -1) continue;
    used.add(url);
    hits.push({ place: { label, detail: detailFrom(line, match.index + match[0].length), url }, at, order: order++ });
  }

  hits.sort((a, b) => a.at - b.at || a.order - b.order);
  return hits.slice(0, Math.max(0, max)).map((hit) => hit.place);
}

/**
 * Indeks tempat satu artikel: satu baris per butir tempat, berisi nama tebalnya
 * dan klausa bus/metro dari baris yang sama (tanpa alamat, tanpa tautan), dipotong
 * ~90 karakter. Dipakai buildGuideContext supaya model menerima daftar tempat
 * yang lengkap walau jendela teks artikelnya cuma muat beberapa baris. Pembacaan
 * barisnya sama dengan placeButtons (PLACE_LINE, alias Amap dibuang), jadi indeks
 * dan kartu tidak mungkin berbeda soal tempat mana yang ada.
 * Tiap baris diberi penanda bagiannya ([dalam kota] / [luar kota]) karena satu
 * artikel bisa memuat dua bagian tempat yang namanya mirip - tanpa penanda itu
 * model sempat menjawab masjid luar kota sebagai masjid dalam kota. Judul `##`
 * sendiri tidak jadi baris indeks, jadi tidak memakan jatah MAX_INDEX_ROWS.
 */
export function placeIndex(text: string): string[] {
  const rows: string[] = [];
  const seen = new Set<string>();
  let prefix = "";
  for (const line of text.split("\n")) {
    const heading = HEADING.exec(line)?.[1];
    if (heading) {
      prefix = SECTION_OUTSIDE.test(heading)
        ? "[luar kota] "
        : SECTION_INSIDE.test(heading)
          ? "[dalam kota] "
          : "";
      continue;
    }
    const match = PLACE_LINE.exec(line);
    const label = match?.[1]?.replace(EMPHASIS, "").trim();
    if (!match || !label) continue;
    // Hanya baris yang punya tautan Amap (halaman POI atau pencarian): baris
    // tebal lain ("Deposit:", "Cari mesinnya.") bukan tempat dan hanya
    // menghabiskan jatah konteks.
    const links = [...line.matchAll(MD_LINK)].map((link) => link[1]);
    if (!links.some((href) => AMAP_HREF.test(href))) continue;
    const rest = detailFrom(line, match.index + match[0].length).replace(EMPHASIS, "");
    const transitAt = rest.search(TRANSIT);
    const source = transitAt === -1 ? rest : rest.slice(transitAt);
    const clause = source.length <= MAX_INDEX ? source : `${source.slice(0, MAX_INDEX).trimEnd()}...`;
    const row = `${prefix}${label} — ${clause}`;
    if (seen.has(row)) continue;
    seen.add(row);
    rows.push(row);
    if (rows.length === MAX_INDEX_ROWS) break;
  }
  return rows;
}
