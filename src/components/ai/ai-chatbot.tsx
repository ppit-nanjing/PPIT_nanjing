"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, X, Send, Loader2, Check, Pencil } from "lucide-react";
import { chatWithAIAction, updateProfileFieldAction } from "@/app/actions/ai";

type Msg = { role: "user" | "assistant"; content: string };

const FIELD_LABELS: Record<string, string> = {
  name: "Nama",
  phone: "Nomor telepon",
  wechatId: "WeChat ID",
  linkedinUrl: "LinkedIn",
  instagramUrl: "Instagram",
  githubUrl: "GitHub",
  spotifyUrl: "Spotify",
  tiktokUrl: "TikTok",
  avatarUrl: "URL foto profil",
};

export function AiChatbot() {
  const [open, setOpen] = useState(false);
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
      setError(e instanceof Error ? e.message : "Gagal menghubungi asisten AI");
    } finally {
      setBusy(false);
    }
  }

  async function confirmEdit() {
    if (!pendingEdit) return;
    const { field, value } = pendingEdit;
    const label = FIELD_LABELS[field] ?? field;
    setPendingEdit(null);
    setBusy(true);
    try {
      await updateProfileFieldAction(field, value);
      setMessages((m) => [...m, { role: "assistant", content: `${label} berhasil diperbarui.` }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `Gagal memperbarui ${label}: ${e instanceof Error ? e.message : "terjadi kesalahan"}` },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function cancelEdit() {
    if (!pendingEdit) return;
    const label = FIELD_LABELS[pendingEdit.field] ?? pendingEdit.field;
    setPendingEdit(null);
    setMessages((m) => [...m, { role: "assistant", content: `Oke, tidak jadi mengubah ${label}.` }]);
  }

  const bubbleClass = (role: string) =>
    role === "user"
      ? "self-end bg-primary-container text-on-primary"
      : "self-start bg-surface-container-low text-on-background";

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 left-6 z-[90] bg-primary-container text-on-primary rounded-full p-4 shadow-lg hover:bg-primary transition-colors"
          aria-label="Asisten AI"
        >
          <Bot size={22} />
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 left-6 z-[90] w-[360px] max-w-[calc(100vw-3rem)] bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
            <span className="text-headline-md text-on-background flex items-center gap-2">
              <Bot size={18} className="text-primary-container" /> Asisten PPIT
            </span>
            <button onClick={() => setOpen(false)} className="text-secondary hover:text-on-background">
              <X size={18} />
            </button>
          </div>

          <div ref={scrollRef} className="flex flex-col gap-3 p-5 h-80 overflow-y-auto">
            {messages.length === 0 && !pendingEdit && (
              <p className="text-body-md text-on-surface-variant">
                Halo! Saya asisten PPIT Nanjing. Tanya apa saja seputar kegiatan, cara bergabung, atau
                kehidupan mahasiswa Indonesia di Nanjing. Saya juga bisa membantu mengubah data profilmu.
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
                  Ubah {FIELD_LABELS[pendingEdit.field] ?? pendingEdit.field}?
                </p>
                <p className="text-on-surface-variant mb-3 break-words">{pendingEdit.value}</p>
                <div className="flex gap-2">
                  <button
                    onClick={confirmEdit}
                    disabled={busy}
                    className="flex items-center gap-1 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-3 py-2 rounded-md hover:bg-primary transition-colors disabled:opacity-50"
                  >
                    <Check size={14} /> Ya, ubah
                  </button>
                  <button
                    onClick={cancelEdit}
                    disabled={busy}
                    className="flex items-center gap-1 text-label-caps px-3 py-2 rounded-md text-secondary hover:text-on-background disabled:opacity-50"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}

            {busy && !pendingEdit && <p className="self-start text-label-caps text-on-surface-variant">Mengetik...</p>}
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
              placeholder="Tulis pertanyaan..."
              className="flex-1 bg-soft-gray rounded-md p-3 text-body-md text-on-background placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary-container"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="bg-primary-container text-on-primary rounded-md p-3 hover:bg-primary transition-colors disabled:opacity-50"
              aria-label="Kirim"
            >
              {busy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
