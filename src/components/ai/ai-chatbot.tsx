"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Loader2, Check, Pencil } from "lucide-react";
import { chatWithAIAction, updateProfileFieldAction } from "@/app/actions/ai";
import { useT } from "@/lib/i18n/client";
import type { TKey } from "@/lib/i18n/dictionaries/id";
import type { T } from "@/lib/i18n/translate";

type Msg = { role: "user" | "assistant"; content: string };

// Only the three descriptive labels are translatable; the rest are product
// names ("WeChat ID", "LinkedIn"), which read the same in both locales.
const FIELD_LABEL_KEYS: Record<string, TKey> = {
  name: "chat.field.name",
  phone: "chat.field.phone",
  avatarUrl: "chat.field.avatarUrl",
};
const FIELD_NAMES: Record<string, string> = {
  wechatId: "WeChat ID",
  linkedinUrl: "LinkedIn",
  instagramUrl: "Instagram",
  githubUrl: "GitHub",
  spotifyUrl: "Spotify",
  tiktokUrl: "TikTok",
};

function fieldLabel(t: T, field: string): string {
  const key = FIELD_LABEL_KEYS[field];
  return key ? t(key) : (FIELD_NAMES[field] ?? field);
}

export function ChatbotPanel() {
  const t = useT();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingEdit, setPendingEdit] = useState<{ field: string; value: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, busy, pendingEdit]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    setError(null);
    try {
      const result = await chatWithAIAction(next);
      if (result.profileEdit) {
        setPendingEdit(result.profileEdit);
      } else {
        setMessages([...next, { role: "assistant", content: result.reply }]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("chat.errContact"));
    } finally {
      setBusy(false);
    }
  }

  async function confirmEdit() {
    if (!pendingEdit) return;
    const { field, value } = pendingEdit;
    const label = fieldLabel(t, field);
    setPendingEdit(null);
    setBusy(true);
    try {
      await updateProfileFieldAction(field, value);
      setMessages((m) => [...m, { role: "assistant", content: t("chat.updated", { label }) }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: t("chat.updateFailed", {
            label,
            reason: e instanceof Error ? e.message : t("chat.genericError"),
          }),
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function cancelEdit() {
    if (!pendingEdit) return;
    const label = fieldLabel(t, pendingEdit.field);
    setPendingEdit(null);
    setMessages((m) => [...m, { role: "assistant", content: t("chat.cancelled", { label }) }]);
  }

  const bubbleClass = (role: string) =>
    role === "user"
      ? "self-end bg-primary-container text-on-primary"
      : "self-start bg-surface-container-low text-on-background";

  return (
    <div className="flex flex-col">
      <div ref={scrollRef} className="flex flex-col gap-3 p-5 h-80 overflow-y-auto">
        {messages.length === 0 && !pendingEdit && (
          <p className="text-body-md text-on-surface-variant">
            {t("chat.greeting")}
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={"max-w-[85%] rounded-lg px-3 py-2 text-body-md " + bubbleClass(m.role)}>
            {m.content}
          </div>
        ))}

        {pendingEdit && (
          <div className="self-start max-w-[90%] rounded-lg border border-primary-container bg-surface-container-low p-3 text-body-md">
            <p className="flex items-center gap-1.5 text-on-background mb-1">
              <Pencil size={14} className="text-primary-container" />
              {t("chat.confirmChange", { label: fieldLabel(t, pendingEdit.field) })}
            </p>
            <p className="text-on-surface-variant mb-3 break-words">{pendingEdit.value}</p>
            <div className="flex gap-2">
              <button
                onClick={confirmEdit}
                disabled={busy}
                className="flex items-center gap-1 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-3 py-2 rounded-md hover:bg-primary transition-colors disabled:opacity-50"
              >
                <Check size={14} /> {t("chat.yesChange")}
              </button>
              <button
                onClick={cancelEdit}
                disabled={busy}
                className="flex items-center gap-1 text-label-caps px-3 py-2 rounded-md text-secondary hover:text-on-background disabled:opacity-50"
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        )}

        {busy && !pendingEdit && <p className="self-start text-label-caps text-on-surface-variant">{t("chat.typing")}</p>}
        {error && <p className="self-start text-label-caps text-error">{error}</p>}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex items-center gap-2 border-t border-outline-variant p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("chat.placeholder")}
          className="flex-1 bg-soft-gray rounded-md p-3 text-body-md text-on-background placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary-container"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="bg-primary-container text-on-primary rounded-md p-3 hover:bg-primary transition-colors disabled:opacity-50"
          aria-label={t("chat.send")}
        >
          {busy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </form>
    </div>
  );
}
