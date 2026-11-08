// Pemotong markdown topik guidebook jadi potongan yang bisa dicari.
//
// Dipakai dua sisi: script ingest (menulis guide_chunks) dan P4 (FTS). Fungsi
// murni - tanpa database, tanpa jaringan - supaya bisa dijalankan lewat
// `npm run check:guidebook` tanpa env.
//
// Aturan yang sengaja dipilih:
// - Batas potongan adalah heading `##`. Dokumen hasil ekstraksi PDF memakai
//   heading itu sebagai penanda bagian, jadi satu bagian = satu topik bahasan.
// - Blok tabel, daftar, dan code fence tidak pernah dipotong di tengah: baris
//   kosong di dalam fence bukan batas blok.
// - Dua bentuk penanda halaman dikenali: baris `{12}--------` dari hasil
//   ekstraksi PDF (dibuang dari teks, hanya rentangnya yang disimpan) dan
//   penanda inline `[[p12]]` yang ditulis pengurus (tetap di teks apa adanya).

export type GuideChunkDraft = {
  ordinal: number;
  heading: string | null;
  pageFrom: number | null;
  pageTo: number | null;
  text: string;
};

/**
 * Naikkan kalau aturan pemotongan berubah. Script ingest membandingkannya
 * dengan guide_meta.chunker_version untuk tahu potongan lama mana yang usang.
 */
export const CHUNKER_VERSION = 1;

/** Kira-kira 800 token. Potongan yang lebih panjang dipotong di batas baris. */
const MAX_CHUNK_CHARS = 3200;
/** Di bawah ini potongannya digabung ke tetangga selama masih muat. */
const MIN_CHUNK_CHARS = 600;

/** Baris pemisah halaman dari ekstraksi PDF, mis. `{12}----------------`. */
const PAGE_RULE = /^\{(\d+)\}-{3,}\s*$/;
/** Penanda halaman inline. */
const PAGE_MARKER = /\[\[p(\d+)\]\]/g;
const FENCE = /^\s*(```|~~~)/;
const HEADING2 = /^##\s+(.*\S)\s*$/;

/** Satu baris plus halaman yang berlaku untuk baris itu (null = belum diketahui). */
type Line = { text: string; page: number | null };
type Section = { heading: string | null; lines: Line[] };

/**
 * Buang baris pemisah halaman tapi ingat nomornya, supaya setiap baris tahu
 * dia ada di halaman berapa tanpa penanda itu ikut masuk ke indeks pencarian.
 */
function withPages(md: string): Line[] {
  const out: Line[] = [];
  let page: number | null = null;
  for (const text of md.replace(/\r\n/g, "\n").split("\n")) {
    const rule = text.match(PAGE_RULE);
    if (rule) {
      page = Number(rule[1]);
      continue;
    }
    out.push({ text, page });
  }
  return out;
}

/** Pecah per heading `##`, tapi jangan pernah di dalam code fence. */
function splitSections(lines: Line[]): Section[] {
  const sections: Section[] = [];
  let current: Section = { heading: null, lines: [] };
  let fence: string | null = null;
  for (const line of lines) {
    const f = line.text.match(FENCE);
    if (f) {
      if (!fence) fence = f[1];
      else if (line.text.trimStart().startsWith(fence)) fence = null;
      current.lines.push(line);
      continue;
    }
    if (!fence) {
      const h = line.text.match(HEADING2);
      if (h) {
        sections.push(current);
        current = { heading: h[1], lines: [] };
        continue;
      }
    }
    current.lines.push(line);
  }
  sections.push(current);
  return sections.filter((s) => s.heading !== null || s.lines.join("").trim() !== "");
}

/** Blok = paragraf/tabel/daftar/fence yang dipisahkan baris kosong. */
function splitBlocks(lines: Line[]): Line[][] {
  const blocks: Line[][] = [];
  let buf: Line[] = [];
  let fence: string | null = null;
  const flush = () => {
    if (buf.some((l) => l.text.trim() !== "")) blocks.push(buf);
    buf = [];
  };
  for (const line of lines) {
    const f = line.text.match(FENCE);
    if (f) {
      if (!fence) fence = f[1];
      else if (line.text.trimStart().startsWith(fence)) fence = null;
      buf.push(line);
      continue;
    }
    if (!fence && line.text.trim() === "") {
      flush();
      continue;
    }
    buf.push(line);
  }
  flush();
  return blocks;
}

/** Blok raksasa dipotong di batas baris; satu baris utuh tidak pernah dibelah. */
function splitLongBlock(block: Line[]): Line[][] {
  const chars = block.reduce((n, l) => n + l.text.length + 1, 0);
  if (chars <= MAX_CHUNK_CHARS) return [block];
  const out: Line[][] = [];
  let buf: Line[] = [];
  let len = 0;
  for (const line of block) {
    if (buf.length && len + line.text.length + 1 > MAX_CHUNK_CHARS) {
      out.push(buf);
      buf = [];
      len = 0;
    }
    buf.push(line);
    len += line.text.length + 1;
  }
  if (buf.length) out.push(buf);
  return out;
}

/** Rentang halaman sebuah potongan: halaman awal, lalu penanda inline menimpanya. */
function pagesOf(lines: Line[]): { from: number | null; to: number | null } {
  let from = lines[0]?.page ?? null;
  let to = lines[lines.length - 1]?.page ?? null;
  for (const line of lines) {
    for (const m of line.text.matchAll(PAGE_MARKER)) {
      const n = Number(m[1]);
      if (from === null) from = n;
      to = n;
    }
  }
  return { from, to };
}

export function chunkMarkdown(md: string): GuideChunkDraft[] {
  const raw: GuideChunkDraft[] = [];

  for (const section of splitSections(withPages(md))) {
    const blocks = splitBlocks(section.lines).flatMap(splitLongBlock);
    if (!blocks.length) continue;

    let buf: Line[][] = [];
    let size = 0;
    const flush = () => {
      if (!buf.length) return;
      const lines = buf.flat();
      const { from, to } = pagesOf(lines);
      raw.push({
        ordinal: raw.length,
        heading: section.heading,
        pageFrom: from,
        pageTo: to,
        text: buf
          .map((b) => b.map((l) => l.text).join("\n").trim())
          .filter((t) => t !== "")
          .join("\n\n"),
      });
      buf = [];
      size = 0;
    };
    for (const block of blocks) {
      const blockChars = block.reduce((n, l) => n + l.text.length + 1, 0);
      // +2 = baris kosong yang memisahkan dua blok di dalam satu potongan.
      if (buf.length && size + blockChars + 2 > MAX_CHUNK_CHARS) flush();
      buf.push(block);
      size += blockChars + 2;
    }
    flush();
  }

  // Potongan pendek (sisa bagian, satu baris lepas) digabung ke tetangga
  // sebelumnya selama heading-nya sama - potongan 3 baris tidak berguna di
  // indeks dan cuma menambah kandidat skoring.
  const merged: GuideChunkDraft[] = [];
  for (const chunk of raw) {
    const prev = merged[merged.length - 1];
    if (
      prev &&
      prev.heading === chunk.heading &&
      chunk.text.length < MIN_CHUNK_CHARS &&
      prev.text.length + chunk.text.length + 2 <= MAX_CHUNK_CHARS
    ) {
      prev.text += `\n\n${chunk.text}`;
      prev.pageTo = chunk.pageTo ?? prev.pageTo;
      continue;
    }
    merged.push({ ...chunk });
  }

  return merged.map((c, ordinal) => ({ ...c, ordinal }));
}
