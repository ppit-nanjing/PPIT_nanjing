// Client-side downscale + re-encode so gallery uploads land at a uniform,
// reasonable size instead of raw phone-camera originals (3-8 MB each).
// Longest edge capped at 1920px. Output is WebP q~0.8 - ~25-35% smaller than
// an equal-quality JPEG - falling back to JPEG on browsers whose canvas can't
// encode WebP (older Safari). Runs entirely in the browser, so the server
// never touches the original bytes. Avatars are NOT routed through this -
// profile pictures stay JPEG for maximum compatibility (in-app browsers).
export async function compressImage(source: Blob, maxEdge = 1920, quality = 0.8): Promise<Blob> {
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
    ctx.drawImage(bitmap, 0, 0, width, height);
    const encode = (mime: string) =>
      new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, quality));

    const webp = await encode("image/webp");
    // Some engines resolve with a PNG/JPEG blob instead of null when they
    // don't support the requested mime - check the type, not just nullness.
    if (webp && webp.type === "image/webp") return webp;

    const jpeg = await encode("image/jpeg");
    if (!jpeg) throw new Error("compress-failed");
    return jpeg;
  } finally {
    bitmap.close();
  }
}
