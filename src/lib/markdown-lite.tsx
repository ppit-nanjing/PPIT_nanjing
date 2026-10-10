// Renderer markdown ringan untuk isi guidebook dan Help Center publik.
//
// Sengaja tidak memakai dangerouslySetInnerHTML dan tidak menambah dependensi:
// isi artikel ditulis pengurus lewat textarea, jadi renderer ini harus tahan
// markdown setengah jadi - tabel tanpa baris penutup, code fence tanpa penutup,
// heading kosong, penanda [[p12]] yang terhapus. Semuanya jadi teks biasa, tidak
// pernah melempar error dan tidak pernah menyuntik HTML.
//
// Hanya struktur yang diatur di sini (ukuran, garis, latar). Warna teks
// diwarisi dari halaman supaya tema kota dan mode gelap tetap berlaku.

import type { ReactNode } from "react";

const FENCE = /^\s*(```|~~~)/;
const PAGE_RULE = /^\{(\d+)\}-{3,}\s*$/;
const HEADING = /^(#{1,6})\s+(.*)$/;
const LIST_ITEM = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
const TABLE_ROW = /^\s*\|/;
const TABLE_SEP = /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/;

const INLINE =
  /(`[^`\n]+`|\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\n]+\*|_[^_\n]+_|!\[[^\]]*\]\([^)\s]*\)|\[[^\]]+\]\([^)\s]*\))/g;

/** Hanya tautan yang aman yang jadi <a>; sisanya ditampilkan apa adanya. */
const SAFE_HREF = /^(https?:|mailto:|\/|#)/i;

const HEADING_CLASS: Record<number, string> = {
  1: "mt-6 mb-2 text-2xl font-semibold",
  2: "mt-6 mb-2 text-xl font-semibold",
  3: "mt-5 mb-2 text-lg font-semibold",
  4: "mt-4 mb-1 font-semibold",
  5: "mt-4 mb-1 font-semibold",
  6: "mt-4 mb-1 text-sm font-semibold uppercase tracking-wide",
};
const LIST_CLASS = "my-3 space-y-1 pl-5";
const TH_CLASS = "border border-outline-variant bg-surface-container-low px-3 py-2 text-left font-semibold";
const TD_CLASS = "border border-outline-variant px-3 py-2 align-top";
const CODE_CLASS = "rounded bg-surface-container-low px-1 py-0.5 text-[0.9em]";
const LINK_CLASS = "text-primary underline underline-offset-2";

type Li = { text: string; ordered: boolean; indent: number; children: Li[] };
type ListItem = { text: string; ordered: boolean; indent: number };

function renderInline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let k = 0;
  for (const m of text.matchAll(INLINE)) {
    const token = m[0];
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    last = at + token.length;

    const image = token.match(/^!\[([^\]]*)\]\([^)]*\)$/);
    if (image) {
      // Gambar dari PDF tidak ikut dihosting; alt-nya saja yang berguna.
      if (image[1].trim()) out.push(image[1].trim());
      continue;
    }
    const link = token.match(/^\[([^\]]+)\]\(([^)\s]*)\)$/);
    if (link) {
      if (SAFE_HREF.test(link[2])) {
        out.push(
          <a key={k++} href={link[2]} className={LINK_CLASS} target="_blank" rel="noreferrer">
            {renderInline(link[1])}
          </a>,
        );
      } else {
        out.push(token);
      }
      continue;
    }
    if (token.startsWith("`")) {
      out.push(
        <code key={k++} className={CODE_CLASS}>
          {token.slice(1, -1)}
        </code>,
      );
      continue;
    }
    if (token.startsWith("**") || token.startsWith("__")) {
      out.push(<strong key={k++}>{token.slice(2, -2)}</strong>);
      continue;
    }
    out.push(<em key={k++}>{token.slice(1, -1)}</em>);
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** Baris tabel jadi sel; pipa pembuka/penutup opsional (baris terakhir sering tidak punya). */
function splitCells(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((c) => c.trim());
}

function renderLevel(items: Li[], key: string): ReactNode {
  const ordered = items[0].ordered;
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag key={key} className={ordered ? `${LIST_CLASS} list-decimal` : `${LIST_CLASS} list-disc`}>
      {items.map((it, n) => (
        <li key={n}>
          {renderInline(it.text)}
          {it.children.length ? renderLevel(it.children, `c${n}`) : null}
        </li>
      ))}
    </Tag>
  );
}

/** Daftar datar + indentasi jadi pohon <ul>/<ol> bersarang. */
function renderList(items: ListItem[], key: string): ReactNode {
  const root: Li[] = [];
  const stack: { indent: number; items: Li[] }[] = [{ indent: -1, items: root }];
  for (const item of items) {
    while (stack.length > 1 && item.indent <= stack[stack.length - 1].indent) stack.pop();
    const node: Li = { ...item, children: [] };
    stack[stack.length - 1].items.push(node);
    stack.push({ indent: item.indent, items: node.children });
  }
  return renderLevel(root, key);
}

export function renderMarkdownLite(md: string): ReactNode {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: ReactNode[] = [];
  let i = 0;
  let k = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") {
      i++;
      continue;
    }

    const fence = line.match(FENCE);
    if (fence) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith(fence[1])) {
        body.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // penutup; kalau tidak ada, sisa baris tetap jadi isi blok
      out.push(
        <pre
          key={k++}
          className="my-3 overflow-x-auto rounded-md bg-surface-container-low p-3 text-sm"
        >
          <code>{body.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    if (PAGE_RULE.test(line)) {
      out.push(<hr key={k++} className="my-6 border-t border-outline-variant" />);
      i++;
      continue;
    }

    const heading = line.match(HEADING);
    if (heading && heading[2].trim() !== "") {
      const level = heading[1].length;
      const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
      out.push(
        <Tag key={k++} className={HEADING_CLASS[level]}>
          {renderInline(heading[2])}
        </Tag>,
      );
      i++;
      continue;
    }

    if (TABLE_ROW.test(line)) {
      const rows: string[][] = [];
      let hasSeparator = false;
      while (i < lines.length && TABLE_ROW.test(lines[i])) {
        if (TABLE_SEP.test(lines[i])) hasSeparator = true;
        else rows.push(splitCells(lines[i]));
        i++;
      }
      if (!hasSeparator) {
        // Bukan tabel - satu baris pipa lepas. Kembalikan ke penanganan paragraf.
        i -= rows.length;
      } else {
        const [head, ...body] = rows;
        out.push(
          <div key={k++} className="my-4 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  {head.map((cell, n) => (
                    <th key={n} className={TH_CLASS}>
                      {renderInline(cell)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((row, n) => (
                  <tr key={n}>
                    {head.map((_, m) => (
                      <td key={m} className={TD_CLASS}>
                        {renderInline(row[m] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        );
        continue;
      }
    }

    const listItem = line.match(LIST_ITEM);
    if (listItem) {
      const items: ListItem[] = [];
      while (i < lines.length) {
        const m = lines[i].match(LIST_ITEM);
        if (m) {
          items.push({
            indent: m[1].replace(/\t/g, "  ").length,
            ordered: /^\d/.test(m[2]),
            text: m[3],
          });
          i++;
          continue;
        }
        // Baris menjorok setelah item = lanjutan item itu, bukan item baru.
        if (items.length && /^\s+\S/.test(lines[i]) && !FENCE.test(lines[i])) {
          items[items.length - 1].text += ` ${lines[i].trim()}`;
          i++;
          continue;
        }
        break;
      }
      out.push(renderList(items, `l${k++}`));
      continue;
    }

    const para: string[] = [];
    while (i < lines.length) {
      const l = lines[i];
      if (
        l.trim() === "" ||
        FENCE.test(l) ||
        PAGE_RULE.test(l) ||
        HEADING.test(l) ||
        TABLE_ROW.test(l) ||
        LIST_ITEM.test(l)
      ) {
        break;
      }
      para.push(l.trim());
      i++;
    }
    out.push(
      <p key={k++} className="my-3 leading-relaxed">
        {renderInline(para.join(" "))}
      </p>,
    );
  }

  return <>{out}</>;
}
