"use client";

import { useEffect, useState } from "react";
import { CopyButton } from "@/components/copy-button";

/**
 * Wrapper that supplies the current page URL to CopyButton - the URL is
 * only known on the client, so we read it after mount.
 */
export function ArticleShare() {
  const [url, setUrl] = useState("");
  useEffect(() => setUrl(window.location.href), []);
  return <CopyButton value={url} label="Salin tautan" />;
}
