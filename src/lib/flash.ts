// Plain helper (no "use client") so Server Action files can import it directly
// to build a redirect() target that carries a one-time toast message. See
// components/console/flash-toast.tsx (<FlashToast/>) for the reader half.
export function withFlash(path: string, message: string, type: "success" | "error" = "success"): string {
  const params = new URLSearchParams({ flash: message });
  if (type === "error") params.set("flashType", "error");
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${params.toString()}`;
}
