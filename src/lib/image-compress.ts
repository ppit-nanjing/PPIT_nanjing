// Client-side downscale + re-encode so uploads land at a uniform, reasonable
// size instead of raw phone-camera originals (3-8 MB each). Images are served
// exactly as stored (`images.unoptimized` in next.config.ts), so whatever
// leaves the browser is what every reader downloads - including readers behind
// the Great Firewall. Runs entirely in the browser, so the server never touches
// the original bytes.

// Longest-edge caps (px). Album photos and covers are shown large; avatars are
// shown at 24-192 CSS px (192 = the org-chart photo preview, 576 physical px on
// a 3x phone), so 1024 leaves headroom for a bigger preview at ~100 KB a file.
export const GALLERY_MAX_EDGE = 1920;
export const CROP_MAX_EDGE = 1600;
export const AVATAR_MAX_EDGE = 1024;

// File extension for an image MIME type, for naming the uploaded File. The blob
// key and Content-Type both follow the extension, so it has to match the bytes.
export function imageExtension(type: string): "webp" | "png" | "gif" | "jpg" {
  if (type === "image/webp") return "webp";
  if (type === "image/png") return "png";
  if (type === "image/gif") return "gif";
  return "jpg";
}

// Caps the longest edge at `maxEdge` and re-encodes to WebP (~25-35% smaller
// than an equal-quality JPEG), falling back to JPEG on browsers whose canvas
// can't encode WebP (older Safari). Avatars are NOT routed through this -
// profile pictures stay JPEG for maximum compatibility (in-app browsers).
//
// Never throws: when the image can't be improved it comes back untouched, and
// /api/upload's type and size checks have the final word.
// - It can't be decoded here (HEIC on desktop Chrome, a browser without
//   createImageBitmap, a file too big to decode): a photo the server would
//   accept must not fail just because the browser couldn't shrink it.
// - It already fits within `maxEdge` and re-encoding doesn't make it smaller
//   (WhatsApp JPEGs, small PNG icons): keep the original instead of paying
//   generation loss for a bigger file.
export async function compressImage(source: Blob, maxEdge = GALLERY_MAX_EDGE, quality = 0.8): Promise<Blob> {
  try {
    return await downscale(source, maxEdge, quality);
  } catch {
    return source;
  }
}

async function downscale(source: Blob, maxEdge: number, quality: number): Promise<Blob> {
  const bitmap = await createImageBitmap(source);
  try {
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("compress-failed");
    // The default ("low") aliases badly on a 2x+ downscale, which is every phone photo.
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, width, height);
    const encode = (mime: string) =>
      new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, quality));

    // Some engines resolve with a PNG/JPEG blob instead of null when they
    // don't support the requested mime - check the type, not just nullness.
    let out = await encode("image/webp");
    if (!out || out.type !== "image/webp") out = await encode("image/jpeg");
    if (!out) throw new Error("compress-failed");

    return scale === 1 && out.size >= source.size ? source : out;
  } finally {
    bitmap.close();
  }
}
