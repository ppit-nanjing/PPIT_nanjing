import DOMPurify from "isomorphic-dompurify";

// Deskripsi acara sekarang rich text (EventDescriptionEditor, TipTap) -
// disimpan sebagai HTML dan dirender lewat dangerouslySetInnerHTML di halaman
// publik, jadi HARUS disanitasi. Dipanggil dua kali dengan sengaja: sekali di
// server action sebelum disimpan (jaga-jaga kalau formData dipalsukan lewat
// jalur lain selain UI editor), sekali lagi tepat sebelum dirender (tidak
// pernah percaya "sudah bersih waktu disimpan" begitu saja).
//
// Tag & atribut dibatasi ke yang benar-benar dihasilkan toolbar editor
// (Bold/Italic/Align/Font/Size) - bukan daftar umum buat rich text bebas.
// `style` diizinkan (dipakai align/font-family/font-size) - DOMPurify sendiri
// menyaring isi berbahaya di dalamnya (mis. expression()/url(javascript:)).
const ALLOWED_TAGS = ["p", "strong", "em", "span", "br"];
const ALLOWED_ATTR = ["style"];

export function sanitizeDescriptionHtml(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR });
}
