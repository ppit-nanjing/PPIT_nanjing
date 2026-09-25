import sanitizeHtml from "sanitize-html";

// Deskripsi acara sekarang rich text (EventDescriptionEditor, TipTap) -
// disimpan sebagai HTML dan dirender lewat dangerouslySetInnerHTML di halaman
// publik, jadi HARUS disanitasi. Dipanggil dua kali dengan sengaja: sekali di
// server action sebelum disimpan (jaga-jaga kalau formData dipalsukan lewat
// jalur lain selain UI editor), sekali lagi tepat sebelum dirender (tidak
// pernah percaya "sudah bersih waktu disimpan" begitu saja).
//
// sanitize-html (htmlparser2-based), bukan isomorphic-dompurify (jsdom-based)
// - percobaan pertama pakai DOMPurify sempat lolos tsc/lint/build lokal tapi
// gagal di runtime serverless Vercel yang sesungguhnya: salah satu dependensi
// jsdom (html-encoding-sniffer -> @exodus/bytes) punya masalah interop ESM/
// CJS di bawah bundling Turbopack ("Failed to load external module jsdom...
// ERR_REQUIRE_ESM"), meng-crash SETIAP muatan /events/[slug] (modulnya
// diimpor di level atas berkas, jadi acara yang descriptionHtml-nya null pun
// ikut kena). jsdom juga berat untuk fungsi serverless (implementasi DOM
// penuh) padahal kebutuhan sanitasi di sini kecil (5 tag, sedikit properti
// CSS) - sanitize-html cocok tanpa DOM sama sekali.
//
// Tag & atribut dibatasi ke yang benar-benar dihasilkan toolbar editor
// (Bold/Italic/Align/Font/Size) - bukan daftar umum buat rich text bebas.
// allowedStyles dibatasi ke NILAI yang benar-benar bisa dihasilkan toolbar
// (var(--font-xxx) dari DESCRIPTION_FONT_OPTIONS, px dari
// DESCRIPTION_SIZE_OPTIONS) - bukan cuma nama propertinya, lebih ketat
// daripada sekadar "izinkan atribut style".
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["p", "strong", "em", "span", "br"],
  allowedAttributes: {
    p: ["style"],
    span: ["style"],
  },
  allowedStyles: {
    p: {
      "text-align": [/^(left|center|right|justify)$/],
    },
    span: {
      "font-family": [/^var\(--font-[a-z0-9]+\)$/],
      "font-size": [/^\d{1,3}px$/],
    },
  },
};

export function sanitizeDescriptionHtml(html: string): string {
  return sanitizeHtml(html, OPTIONS);
}
