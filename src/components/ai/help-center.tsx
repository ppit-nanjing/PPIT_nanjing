"use client";

import { useRef, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion } from "motion/react";
import { X, Bot, MessageSquarePlus, type LucideIcon } from "lucide-react";
import { ChatbotPanel } from "@/components/ai/ai-chatbot";
import { FeedbackPanel } from "@/components/feedback/feedback-widget";
import { useDraggable } from "@/components/ai/use-draggable";
import { useT } from "@/lib/i18n/client";

type BubbleProps = {
  icon: LucideIcon;
  label: string;
  /** localStorage prefix; `_launcher` and `_panel` are suffixed per element. */
  storageKey: string;
  /** Sama untuk semua bubble: barisnya sejajar di bawah, panelnya di atas baris itu. */
  placement: { launcher: string; panel: string };
  open: boolean;
  onToggle: () => void;
  disabled?: boolean;
  children: ReactNode;
};

/** Bola yang bisa digeser: tombol tetap terlihat saat panelnya terbuka. */
function FloatingBubble({ icon: Icon, label, storageKey, placement, open, onToggle, disabled, children }: BubbleProps) {
  const t = useT();
  const launcherRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelHeaderRef = useRef<HTMLDivElement>(null);
  const launcher = useDraggable<HTMLButtonElement>(launcherRef, { storageKey: `${storageKey}_launcher` });
  const panel = useDraggable<HTMLDivElement>(panelHeaderRef, {
    measureRef: panelRef,
    storageKey: `${storageKey}_panel`,
    ignoreInteractive: true,
    enabled: open,
  });

  return (
    <>
      <motion.button
        ref={launcherRef}
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-expanded={open}
        aria-label={label}
        style={launcher.pos ? { left: launcher.pos.x, top: launcher.pos.y } : undefined}
        variants={{ idle: { scale: 1 }, pop: { scale: [1, 0.85, 1.12, 1] } }}
        animate={open ? "pop" : "idle"}
        whileHover={disabled ? undefined : { scale: 1.08 }}
        whileTap={disabled ? undefined : { scale: 0.9 }}
        transition={{ duration: 0.35, times: [0, 0.25, 0.6, 1] }}
        className={`fixed z-[70] rounded-full p-4 shadow-lg touch-none select-none cursor-grab active:cursor-grabbing ${
          open
            ? "bg-primary text-on-primary ring-2 ring-primary-container/50"
            : "bg-primary-container text-on-primary hover:bg-primary"
        } ${disabled ? "opacity-40 cursor-not-allowed" : ""} ${launcher.pos ? "" : placement.launcher}`}
      >
        <Icon size={22} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            style={{ transformOrigin: "bottom right", ...(panel.pos ? { left: panel.pos.x, top: panel.pos.y } : {}) }}
            className={`fixed z-[60] w-[360px] max-w-[calc(100vw-2rem)] bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg overflow-hidden flex flex-col ${
              panel.pos ? "" : placement.panel
            }`}
          >
            <div
              ref={panelHeaderRef}
              className="flex items-center justify-between gap-3 px-5 py-3 border-b border-outline-variant touch-none select-none cursor-grab active:cursor-grabbing"
            >
              <span className="flex items-center gap-2 text-label-caps uppercase tracking-wide text-on-background">
                <Icon size={16} className="text-primary-container" /> {label}
              </span>
              <button
                type="button"
                onClick={onToggle}
                className="text-secondary hover:text-on-background"
                aria-label={t("common.close")}
              >
                <X size={18} />
              </button>
            </div>
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export function HelpCenter({ authed }: { authed: boolean }) {
  const t = useT();
  // Prop `authed` berasal dari render layout di server. Setelah login lewat
  // Server Action, navigasi klien bisa masih memakai payload layout yang guest,
  // jadi sesi di sisi klien ikut dibaca (SessionResync di providers.tsx
  // menyamakannya dengan server begitu keduanya berbeda).
  const { status } = useSession();
  const canChat = authed || status === "authenticated";
  // Satu panel terbuka pada satu waktu; keduanya jangkar di sudut yang sama.
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <>
      <FloatingBubble
        icon={Bot}
        label={t("help.tabChat")}
        storageKey="ppitn_help"
        placement={{ launcher: "bottom-24 right-4 sm:bottom-6 sm:right-6", panel: "bottom-40 right-4 sm:bottom-24 sm:right-6" }}
        open={openId === "chat"}
        onToggle={() => canChat && setOpenId((id) => (id === "chat" ? null : "chat"))}
        disabled={!canChat}
      >
        <ChatbotPanel />
      </FloatingBubble>
      <FloatingBubble
        icon={MessageSquarePlus}
        label={t("help.tabFeedback")}
        storageKey="ppitn_feedback"
        placement={{ launcher: "bottom-24 right-[5.5rem] sm:bottom-6 sm:right-[5.5rem]", panel: "bottom-40 right-4 sm:bottom-24 sm:right-6" }}
        open={openId === "feedback"}
        onToggle={() => setOpenId((id) => (id === "feedback" ? null : "feedback"))}
      >
        <FeedbackPanel />
      </FloatingBubble>
    </>
  );
}
