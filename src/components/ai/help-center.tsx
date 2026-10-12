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
  open: boolean;
  onToggle: () => void;
  disabled?: boolean;
};

type PanelId = "chat" | "feedback";

/** Bola aksi di tumpukan kanan bawah; ikut tergeser bersama kontainernya. */
function Bubble({ icon: Icon, label, open, onToggle, disabled }: BubbleProps) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-expanded={open}
      variants={{
        idle: { scale: 1 },
        pop: { scale: [1, 0.85, 1.12, 1], transition: { duration: 0.35, times: [0, 0.25, 0.6, 1] } },
      }}
      animate={open ? "pop" : "idle"}
      // Hover dan tap punya spring sendiri yang cepat. Sebelumnya keduanya ikut
      // memakai transisi pop (350 ms + `times` keyframe), jadi kursor yang
      // berhenti di atas bola terasa menyendat.
      whileHover={disabled ? undefined : { scale: 1.06, transition: { type: "spring", stiffness: 600, damping: 30, mass: 0.5 } }}
      whileTap={disabled ? undefined : { scale: 0.92, transition: { type: "spring", stiffness: 700, damping: 28, mass: 0.5 } }}
      transition={{ type: "spring", stiffness: 500, damping: 30, mass: 0.6 }}
      className={`pointer-events-auto rounded-full p-4 shadow-lg transition-colors duration-150 will-change-transform ${
        open
          ? "bg-primary text-on-primary ring-2 ring-primary-container/50"
          : "bg-primary-container text-on-primary hover:bg-primary"
      } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
    >
      <Icon size={22} />
    </motion.button>
  );
}

/** Panel yang menempel langsung di atas tumpukan bola, rata kanan. */
function Panel({ label, icon: Icon, open, onClose, children }: {
  label: string;
  icon: LucideIcon;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const t = useT();
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
          style={{ transformOrigin: "bottom right" }}
          className="pointer-events-auto absolute right-0 bottom-full z-10 mb-3 flex w-[360px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-lg"
        >
          <div className="flex items-center justify-between gap-3 border-b border-outline-variant px-5 py-3">
            <span className="flex items-center gap-2 text-label-caps uppercase tracking-wide text-on-background">
              <Icon size={16} className="text-primary-container" /> {label}
            </span>
            <button type="button" onClick={onClose} className="text-secondary hover:text-on-background" aria-label={t("common.close")}>
              <X size={18} />
            </button>
          </div>
          {children}
        </motion.div>
      )}
    </AnimatePresence>
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

  // Satu panel terbuka pada satu waktu.
  const [openId, setOpenId] = useState<PanelId | null>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  // Seluruh widget digeser sebagai satu kesatuan, jadi panelnya selalu ikut
  // dan tidak pernah lepas dari tumpukan bolanya.
  const { pos } = useDraggable<HTMLDivElement>(stackRef, { measureRef: boxRef, storageKey: "ppitn_help_pos" });

  return (
    <div
      ref={boxRef}
      style={pos ? { left: pos.x, top: pos.y } : undefined}
      className={`pointer-events-none fixed z-[70] ${pos ? "" : "right-4 bottom-24 sm:right-6 sm:bottom-6"}`}
    >
      <Panel
        label={t("help.tabFeedback")}
        icon={MessageSquarePlus}
        open={openId === "feedback"}
        onClose={() => setOpenId(null)}
      >
        <FeedbackPanel />
      </Panel>
      <Panel label={t("help.tabChat")} icon={Bot} open={openId === "chat"} onClose={() => setOpenId(null)}>
        <ChatbotPanel />
      </Panel>

      <div
        ref={stackRef}
        className="pointer-events-auto flex touch-none flex-col items-end gap-3 select-none cursor-grab active:cursor-grabbing"
      >
        <Bubble
          icon={MessageSquarePlus}
          label={t("help.tabFeedback")}
          open={openId === "feedback"}
          onToggle={() => setOpenId((id) => (id === "feedback" ? null : "feedback"))}
        />
        <Bubble
          icon={Bot}
          label={t("help.tabChat")}
          open={openId === "chat"}
          onToggle={() => canChat && setOpenId((id) => (id === "chat" ? null : "chat"))}
          disabled={!canChat}
        />
      </div>
    </div>
  );
}
