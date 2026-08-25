// Client-side downscale + re-encode so gallery uploads land at a uniform,
// reasonable size instead of raw phone-camera originals (3-8 MB each).
// Longest edge capped at 1920px, JPEG q=0.82 - visually indistinguishable
// for web display, typically lands at 200-500 KB per photo. Runs entirely
// in the browser, so the server never touches the original bytes.
export async function compressImage(file: File, maxEdge = 1920, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
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
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (!blob) throw new Error("compress-failed");
    return blob;
  } finally {
    bitmap.close();
  }
}
