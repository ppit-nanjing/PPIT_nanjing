"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { X, MousePointerClick, RotateCcw, Bug, Palette, Lightbulb, MessageCircle, MapPin } from "lucide-react";
import { submitFeedback } from "@/app/actions/feedback";
import { AIImproveButton } from "@/components/ai/ai-improve-button";
import { pickElementAt, type PickedElement } from "./element-picker";
import { useT } from "@/lib/i18n/client";
import type { TKey } from "@/lib/i18n/dictionaries/id";

type Category = "bug" | "design" | "feature" | "general";

const CATEGORIES: { key: Category; labelKey: TKey; icon: typeof Bug; placeholderKey: TKey }[] = [
  { key: "bug", labelKey: "feedback.catBug", icon: Bug, placeholderKey: "feedback.phBug" },
  { key: "design", labelKey: "feedback.catDesign", icon: Palette, placeholderKey: "feedback.phDesign" },
  { key: "feature", labelKey: "feedback.catFeature", icon: Lightbulb, placeholderKey: "feedback.phFeature" },
  { key: "general", labelKey: "feedback.catGeneral", icon: MessageCircle, placeholderKey: "feedback.phGeneral" },
];

const DRAFT_KEY = "ppitn_feedback_drafts";

function loadDrafts(): Record<Category, string> {
  if (typeof window === "undefined") return { bug: "", design: "", feature: "", general: "" };
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : { bug: "", design: "", feature: "", general: "" };
  } catch {
    return { bug: "", design: "", feature: "", general: "" };
  }
}

export function FeedbackPanel() {
  const t = useT();
  const pathname = usePathname();
  const [category, setCategory] = useState<Category>("bug");
  const [drafts, setDrafts] = useState<Record<Category, string>>({ bug: "", design: "", feature: "", general: "" });
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<PickedElement | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Load persisted drafts after mount (localStorage is unavailable during SSR).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setDrafts(loadDrafts()), []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
  }, [drafts]);

  // Element picker: highlight under cursor, capture on click, then exit picker mode.
  useEffect(() => {
    if (!picking) return;

    function onMove(e: MouseEvent) {
      const result = pickElementAt(e.clientX, e.clientY);
      if (result && overlayRef.current) {
        const { rect } = result.picked;
        Object.assign(overlayRef.current.style, {
          display: "block",
          left: `${rect.x}px`,
          top: `${rect.y}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
        });
      }
    }

    function onClick(e: MouseEvent) {
      e.preventDefault();
      e.stopPropagation();
      const result = pickElementAt(e.clientX, e.clientY);
      if (result) {
        setPicked(result.picked);
        setPicking(false);
      }
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("click", onClick, { capture: true });
    document.body.style.cursor = "crosshair";
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("click", onClick, { capture: true });
      document.body.style.cursor = "";
    };
  }, [picking]);

  function updateDraft(text: string) {
    setDrafts((d) => ({ ...d, [category]: text }));
  }

  function resetDraft() {
    setDrafts((d) => ({ ...d, [category]: "" }));
    setPicked(null);
  }

  async function handleSubmit() {
    const message = drafts[category].trim();
    if (!message) return;
    setSubmitting(true);
    await submitFeedback({
      category,
      message,
      pagePath: pathname,
      elementSelector: picked?.selector ?? null,
      elementDescription: picked?.description ?? null,
      elementRect: picked?.rect ?? null,
      viewport: { width: window.innerWidth, height: window.innerHeight },
    });
    setDrafts((d) => ({ ...d, [category]: "" }));
    setPicked(null);
    setSubmitting(false);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 2500);
  }

  const activeCategory = CATEGORIES.find((c) => c.key === category)!;

  return (
    <>
      {/* Element-picker highlight overlay */}
      <div
        ref={overlayRef}
        className="fixed pointer-events-none z-[200] border-2 border-primary-container bg-primary-container/10 rounded-sm hidden"
      />
      {picking && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] bg-on-background text-inverse-on-surface text-label-caps px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
          <MousePointerClick size={14} /> {t("feedback.pickHint")}
        </div>
      )}

      <div className="flex border-b border-outline-variant">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setCategory(c.key)}
            className={`flex-1 flex flex-col items-center gap-1 py-3 text-label-caps transition-colors ${
              category === c.key
                ? "text-primary-container border-b-2 border-primary-container bg-primary-container/5"
                : "text-secondary hover:text-on-background"
            }`}
          >
            <c.icon size={16} />
            {t(c.labelKey)}
          </button>
        ))}
      </div>

      <div className="p-5">
        {submitted ? (
          <p className="text-body-md text-center py-6 text-on-background">
            {t("feedback.thanks")}
          </p>
        ) : (
          <>
            <textarea
              value={drafts[category]}
              onChange={(e) => updateDraft(e.target.value)}
              placeholder={t(activeCategory.placeholderKey)}
              rows={4}
              className="w-full bg-soft-gray rounded-md p-3 text-body-md text-on-background placeholder:text-on-surface-variant resize-none focus:outline-none focus:ring-2 focus:ring-primary-container mb-2"
            />
            <AIImproveButton
              context="feedback"
              value={drafts[category]}
              onImproved={(text) => updateDraft(text)}
              label={t("ai.improveFeedback")}
              className="mb-2"
            />

            {picked ? (
              <div className="flex items-center justify-between gap-2 bg-surface-container-low border border-outline-variant rounded-md px-3 py-2 mb-3 text-label-caps">
                <span className="flex items-center gap-1.5 truncate text-on-surface-variant">
                  <MapPin size={13} aria-hidden /> {picked.description}
                </span>
                <button onClick={() => setPicked(null)} className="text-secondary hover:text-error shrink-0">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setPicking(true)}
                className="flex items-center gap-2 text-label-caps text-primary-container hover:text-primary mb-3"
              >
                <MousePointerClick size={14} /> {t("feedback.markElement")}
              </button>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={resetDraft}
                disabled={!drafts[category] && !picked}
                className="flex items-center gap-1 text-label-caps text-secondary hover:text-on-background disabled:opacity-40"
              >
                <RotateCcw size={14} /> {t("feedback.reset")}
              </button>
              <button
                onClick={handleSubmit}
                disabled={!drafts[category].trim() || submitting}
                className="flex-1 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide py-2.5 rounded-md hover:bg-primary transition-colors disabled:opacity-50"
              >
                {submitting ? t("feedback.submitting") : t("feedback.submit")}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
