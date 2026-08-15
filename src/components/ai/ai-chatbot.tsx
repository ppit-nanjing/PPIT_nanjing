"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, X, Send, Loader2 } from "lucide-react";
import { chatWithAIAction } from "@/app/actions/ai";

type Msg = { role: "user" | "assistant"; content: string };

export function AiChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, busy]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    setError(null);
    try {
      const reply = await chatWithAIAction(next);
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menghubungi asisten AI");
    } finally {
      setBusy(false);
    }
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
            {messages.length === 0 && (
              <p className="text-body-md text-on-surface-variant">
                Halo! Saya asisten PPIT Nanjing. Tanya apa saja seputar kegiatan, cara bergabung, atau
                kehidupan mahasiswa Indonesia di Nanjing.
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={"max-w-[85%] rounded-lg px-3 py-2 text-body-md " + bubbleClass(m.role)}>
                {m.content}
              </div>
            ))}
            {busy && <p className="self-start text-label-caps text-on-surface-variant">Mengetik...</p>}
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
