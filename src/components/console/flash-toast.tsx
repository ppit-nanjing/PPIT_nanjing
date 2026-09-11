"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

/**
 * Shows a one-time toast carried across a Server Action's redirect() via a
 * `?flash=<message>` (optionally `&flashType=error`) query param, then strips
 * it from the URL so a refresh or back-navigation doesn't repeat it.
 *
 * Needed because redirect() unmounts the client subtree that would otherwise
 * detect the action's pending -> done transition (see SubmitButton /
 * useActionToast in submit-button.tsx) - so those never fire a toast for an
 * action that redirects on success (e.g. upsertNewsArticle, createGalleryAlbum).
 * `useSearchParams()` gets a fresh identity on every navigation to the route,
 * so this fires reliably even for a repeated identical `?flash=` value.
 *
 * Drop <FlashToast /> once on any page a redirecting server action can land
 * on with `?flash=...` appended to its destination (build that with
 * `withFlash()` from `@/lib/flash`).
 */
export function FlashToast() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const message = searchParams.get("flash");
    if (!message) return;
    if (searchParams.get("flashType") === "error") toast.error(message);
    else toast.success(message);

    const params = new URLSearchParams(searchParams.toString());
    params.delete("flash");
    params.delete("flashType");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [searchParams, pathname, router]);

  return null;
}
