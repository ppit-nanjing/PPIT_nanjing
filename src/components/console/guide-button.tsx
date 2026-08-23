"use client";

import { useState } from "react";
import { HelpCircle, X } from "lucide-react";

type Props = {
  title: string;
  content: string;
  /** Slug in help_articles, if this guide also has a full page under /console/docs/[slug]. */
  docSlug?: string;
};

// Small "how do I fill this in" button meant to sit in the header of every
// console module page. Opens the guide inline as a modal instead of
// navigating away, since the whole point is not losing your place on a form
// you're already halfway through.
export function GuideButton({ title, content, docSlug }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 border border-outline-variant text-on-surface-variant text-label-caps uppercase tracking-wide px-3.5 py-2 rounded-md hover:bg-surface-container-low hover:text-on-background transition-colors shrink-0"
      >
        <HelpCircle size={16} /> Panduan
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[10vh]"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`Panduan: ${title}`}
        >
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-lg max-h-[75vh] flex flex-col bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-outline-variant">
              <h2 className="text-headline-sm text-on-background">{title}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Tutup panduan"
                className="text-on-surface-variant hover:text-on-background shrink-0 p-1 -m-1"
              >
                <X size={20} />
              </button>
            </div>
            <div className="px-5 py-4 overflow-y-auto text-body-md text-on-surface-variant whitespace-pre-wrap">
              {content}
            </div>
            {docSlug && (
              <div className="px-5 py-3 border-t border-outline-variant">
                <a
                  href={`/console/docs/${docSlug}`}
                  className="text-label-caps uppercase tracking-wide text-primary-container hover:text-primary"
                >
                  Baca &amp; edit di Dokumentasi →
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
