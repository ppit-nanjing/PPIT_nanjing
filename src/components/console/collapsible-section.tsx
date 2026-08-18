"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

export function CollapsibleSection({
  title,
  description,
  children,
  defaultOpen = true,
  className = "",
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 text-left hover:bg-surface-container-low/60 transition-colors"
      >
        <span className="flex flex-col">
          <span className="text-headline-sm text-on-background">{title}</span>
          {description ? (
            <span className="text-body-sm text-on-surface-variant mt-0.5">{description}</span>
          ) : null}
        </span>
        {open ? (
          <ChevronDown size={20} className="text-on-surface-variant shrink-0" />
        ) : (
          <ChevronRight size={20} className="text-on-surface-variant shrink-0" />
        )}
      </button>
      {open ? <div className="px-4 pb-5 sm:px-6 sm:pb-6">{children}</div> : null}
    </section>
  );
}
