import sanitizeHtml from "sanitize-html";

// Berita memakai rich text yang lebih luas daripada deskripsi acara. Tetap
// pakai allowlist kecil: HTML ini dirender di halaman publik, jadi tak ada
// style bebas, event handler, data URL, atau tag embed yang boleh lolos.
function isNewsBlobUrl(src: string | undefined): boolean {
  if (!src) return false;
  try {
    const url = new URL(src);
    return (
      url.protocol === "https:" &&
      url.hostname.endsWith(".public.blob.vercel-storage.com") &&
      url.pathname.startsWith("/news/")
    );
  } catch {
    return false;
  }
}

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["p", "h2", "h3", "strong", "em", "s", "ul", "ol", "li", "blockquote", "a", "br", "figure", "img", "figcaption"],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: { img: ["https"] },
  exclusiveFilter: (frame) => frame.tag === "img" && !isNewsBlobUrl(frame.attribs.src),
  transformTags: {
    a: (tagName, attribs) => {
      const href = attribs.href ?? "";
      const safeAttrs: Record<string, string> = href ? { href } : {};
      if (href && !href.startsWith("mailto:")) {
        safeAttrs.target = "_blank";
        safeAttrs.rel = "noopener noreferrer";
      }
      return { tagName, attribs: safeAttrs };
    },
  },
};

export function sanitizeNewsHtml(html: string): string {
  return sanitizeHtml(html, OPTIONS);
}
