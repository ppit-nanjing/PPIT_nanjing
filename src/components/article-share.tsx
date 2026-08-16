"use client";

import { useEffect, useState } from "react";
import { CopyButton } from "@/components/copy-button";

/**
 * Wrapper that supplies the current page URL to CopyButton - the URL is
 * only known on the client, so we read it after mount.
 */
export function ArticleShare() {
  const [url, setUrl] = useState("");
  // URL is only known on the client; read it after mount to avoid an SSR hydration mismatch.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setUrl(window.location.href), []);
  return <CopyButton value={url} label="Salin tautan" />;
}
