import { Fragment } from "react";

// Teks bebas buatan pengurus (deskripsi form, teks bantuan pertanyaan) dengan
// tautan yang bisa diklik. Dua bentuk dikenali:
//   [label](https://…)  -> tautan berlabel, mis. "[Unduh format CV](https://…)"
//   https://…           -> URL telanjang, ditampilkan apa adanya
// HANYA https:// yang dijadikan tautan — http:, javascript:, data: tetap teks
// biasa — dan selalu dibuka di tab baru tanpa referrer. Komponen murni (tanpa
// hook), aman dipakai di Server maupun Client Component.
const LINK_RE = /\[([^\]\n]{1,120})\]\((https:\/\/[^\s)]+)\)|(https:\/\/[^\s<>"')]+)/g;

const LINK_CLASS = "text-primary-container underline underline-offset-2 break-all hover:text-primary";

export function LinkifiedText({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(LINK_RE)) {
    const index = m.index ?? 0;
    if (index > last) parts.push(text.slice(last, index));
    // URL telanjang di akhir kalimat: tanda baca penutup bukan bagian tautan.
    const bare = m[3]?.replace(/[.,;:!?]+$/, "");
    const href = m[2] ?? bare!;
    const label = m[1] ?? bare!;
    parts.push(
      <a key={index} href={href} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
        {label}
      </a>,
    );
    last = index + (m[1] ? m[0].length : bare!.length);
  }
  if (last < text.length) parts.push(text.slice(last));
  return <Fragment>{parts}</Fragment>;
}
