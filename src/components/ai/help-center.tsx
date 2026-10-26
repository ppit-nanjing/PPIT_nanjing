"use client";

import { useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion } from "motion/react";
import { X, Bot, MessageSquarePlus, type LucideIcon } from "lucide-react";
import { ChatbotPanel } from "@/components/ai/ai-chatbot";
import { FeedbackPanel } from "@/components/feedback/feedback-widget";
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
      transition={{ duration: 0.2, ease: "easeOut" }}
      // Hover dan tap sengaja pakai transisi CSS seperti tombol "Jelajahi
      // Kegiatan" (MovingArrow), bukan spring Motion: transform-nya jalan di
      // compositor, jadi tidak ikut tersendat saat main thread sibuk. Motion
      // hanya dipakai untuk pop saat panel dibuka.
      className={`group pointer-events-auto rounded-full p-4 shadow-lg transition-[filter,background-color] duration-200 ease-out hover:brightness-95 motion-reduce:transition-none ${
        open
          ? "bg-primary text-on-primary ring-2 ring-primary-container/50"
          : "bg-primary-container text-on-primary"
      } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
    >
      <span className="flex transition-transform duration-200 ease-out group-hover:scale-110 group-active:scale-90 motion-reduce:transition-none motion-reduce:group-hover:scale-100 motion-reduce:group-active:scale-100">
        <Icon size={22} />
      </span>
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

  return (
    <div className="pointer-events-none fixed z-[70] right-4 bottom-24 sm:right-6 sm:bottom-6">
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

      <div className="pointer-events-auto flex flex-col items-end gap-3">
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
