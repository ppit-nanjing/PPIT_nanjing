"use client";

import { useRef, useState } from "react";
import { X, Bot, MessageSquarePlus } from "lucide-react";
import { ChatbotPanel } from "@/components/ai/ai-chatbot";
import { FeedbackPanel } from "@/components/feedback/feedback-widget";
import { useDraggable } from "@/components/ai/use-draggable";
import { useT } from "@/lib/i18n/client";

type Tab = "chat" | "feedback";

export function HelpCenter({ authed }: { authed: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>(authed ? "chat" : "feedback");
  const launcherRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelHeaderRef = useRef<HTMLDivElement>(null);
  const launcher = useDraggable<HTMLButtonElement>(launcherRef, {
    storageKey: "ppitn_help_launcher",
    enabled: !open,
  });
  const panel = useDraggable<HTMLDivElement>(panelHeaderRef, {
    measureRef: panelRef,
    storageKey: "ppitn_help_panel",
    ignoreInteractive: true,
    enabled: open,
  });

  function toggle() {
    if (!open && !authed) setTab("feedback");
    setOpen((o) => !o);
  }

  function close() {
    setOpen(false);
  }

  return (
    <>
      {!open && (
        <button
          ref={launcherRef}
          onClick={toggle}
          style={launcher.pos ? { left: launcher.pos.x, top: launcher.pos.y } : undefined}
          className={`fixed z-[60] bg-primary-container text-on-primary rounded-full p-4 shadow-lg hover:bg-primary transition-colors touch-none select-none cursor-grab active:cursor-grabbing ${
            launcher.pos ? "" : "bottom-24 right-4 sm:bottom-6 sm:right-6"
          }`}
          aria-label={t("help.launcherAria")}
        >
          <MessageSquarePlus size={22} />
        </button>
      )}

      {open && (
        <div
          ref={panelRef}
          style={panel.pos ? { left: panel.pos.x, top: panel.pos.y } : undefined}
          className={`fixed z-[60] w-[360px] max-w-[calc(100vw-2rem)] bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg overflow-hidden flex flex-col ${
            panel.pos ? "" : "bottom-24 right-4 sm:bottom-6 sm:right-6"
          }`}
        >
          <div
            ref={panelHeaderRef}
            className="flex items-center justify-between px-5 py-3 border-b border-outline-variant touch-none select-none cursor-grab active:cursor-grabbing"
          >
            <div className="flex items-center gap-1">
              <button
                onClick={() => authed && setTab("chat")}
                disabled={!authed}
                className={`flex items-center gap-1.5 text-label-caps uppercase tracking-wide px-2 py-1 rounded-md transition-colors ${
                  tab === "chat"
                    ? "text-primary-container bg-primary-container/10"
                    : "text-secondary hover:text-on-background"
                } ${!authed ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                <Bot size={16} /> {t("help.tabChat")}
              </button>
              <button
                onClick={() => setTab("feedback")}
                className={`flex items-center gap-1.5 text-label-caps uppercase tracking-wide px-2 py-1 rounded-md transition-colors ${
                  tab === "feedback"
                    ? "text-primary-container bg-primary-container/10"
                    : "text-secondary hover:text-on-background"
                }`}
              >
                <MessageSquarePlus size={16} /> {t("help.tabFeedback")}
              </button>
            </div>
            <button onClick={close} className="text-secondary hover:text-on-background" aria-label={t("common.close")}>
              <X size={18} />
            </button>
          </div>

          {authed && tab === "chat" ? <ChatbotPanel /> : <FeedbackPanel />}
        </div>
      )}
    </>
  );
}
