"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

// Returns the user to the previous page, discarding unsaved form changes.
// Falls back to "/" if there is no browser history (e.g. direct load).
export function BackButton({ label = "Batal", className = "" }: { label?: string; className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className={`flex items-center gap-2 bg-surface-container-low text-on-background text-label-caps uppercase tracking-wide px-6 py-3 rounded-md border border-outline-variant hover:bg-surface-container-lowest transition-colors ${className}`}
    >
      <ArrowLeft size={14} /> {label}
    </button>
  );
}
