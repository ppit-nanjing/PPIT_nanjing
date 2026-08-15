"use client";

import { useState } from "react";
import { X, Bot, MessageSquarePlus } from "lucide-react";
import { ChatbotPanel } from "@/components/ai/ai-chatbot";
import { FeedbackPanel } from "@/components/feedback/feedback-widget";

type Tab = "chat" | "feedback";

export function HelpCenter({ authed }: { authed: boolean }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>(authed ? "chat" : "feedback");

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
          onClick={toggle}
          className="fixed bottom-6 right-6 z-[90] bg-primary-container text-on-primary rounded-full p-4 shadow-lg hover:bg-primary transition-colors"
          aria-label="Bantuan & Masukan"
        >
          <MessageSquarePlus size={22} />
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-[90] w-[360px] max-w-[calc(100vw-3rem)] bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-3 border-b border-outline-variant">
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
                <Bot size={16} /> Asisten AI
              </button>
              <button
                onClick={() => setTab("feedback")}
                className={`flex items-center gap-1.5 text-label-caps uppercase tracking-wide px-2 py-1 rounded-md transition-colors ${
                  tab === "feedback"
                    ? "text-primary-container bg-primary-container/10"
                    : "text-secondary hover:text-on-background"
                }`}
              >
                <MessageSquarePlus size={16} /> Masukan
              </button>
            </div>
            <button onClick={close} className="text-secondary hover:text-on-background" aria-label="Tutup">
              <X size={18} />
            </button>
          </div>

          {authed && tab === "chat" ? <ChatbotPanel /> : <FeedbackPanel />}
        </div>
      )}
    </>
  );
}
