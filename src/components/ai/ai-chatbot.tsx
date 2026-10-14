"use client";

import { useEffect, useRef, useState } from "react";
import {
  Send,
  Loader2,
  Check,
  Pencil,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  CornerDownRight,
  BookOpenText,
  ExternalLink,
  Copy,
} from "lucide-react";
import { chatWithAIAction, rateAnswerAction, updateProfileFieldAction, type ChatCitation } from "@/app/actions/ai";
import { renderMarkdownLite } from "@/lib/markdown-lite";
import { useT } from "@/lib/i18n/client";
import { motion } from "motion/react";
import type { TKey } from "@/lib/i18n/dictionaries/id";
import type { T } from "@/lib/i18n/translate";

type Msg = {
  role: "user" | "assistant";
  content: string;
  // Ditempel ke balasan asisten: sumber jawaban, saran pertanyaan lanjutan, dan
  // id baris log yang jadi rujukan tombol suka/tidak suka.
  citations?: ChatCitation[];
  followUps?: string[];
  logId?: string;
  vote?: "up" | "down";
};

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

/** Rentang halaman aslinya dari PDF sumber, atau null kalau tidak ada. */
function citationPage(t: T, c: ChatCitation): string | null {
  if (c.pageFrom !== null && c.pageTo !== null && c.pageTo !== c.pageFrom) {
    return t("chat.sourcePageRange", { from: c.pageFrom, to: c.pageTo });
  }
  const single = c.pageFrom ?? c.pageTo;
  return single === null ? null : t("chat.sourcePage", { page: single });
}

export function ChatbotPanel() {
  const t = useT();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingEdit, setPendingEdit] = useState<{ field: string; value: string } | null>(null);
  // Satu panel sumber terbuka pada satu waktu, dan hanya satu tombol suara yang
  // sedang dikirim, supaya klik ganda tidak mengirim dua kali ke baris log yang
  // sama.
  const [openSources, setOpenSources] = useState<number | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  // Indeks pesan yang terakhir disalin / disukai: dipakai menampilkan centang
  // "tersalin" dan ucapan terima kasih, lalu hilang sendiri.
  const [copied, setCopied] = useState<number | null>(null);
  const [thanked, setThanked] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll ke bawah tiap ada pesan baru / status berubah, dengan animasi.
  // rAF memastikan tinggi isi sudah terhitung dulu (jawaban panjang yang baru
  // dirender); pengguna yang memilih kurangi gerakan tetap dapat scroll instan.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const id = requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: reduce ? "auto" : "smooth" });
    });
    return () => cancelAnimationFrame(id);
  }, [messages, busy, pendingEdit]);

  // `override` dipakai tombol pertanyaan lanjutan: teksnya dikirim apa adanya
  // dan kotak ketiknya tidak diisi/dikosongkan.
  async function send(override?: string) {
    const text = (override ?? input).trim();
    if (!text || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    if (!override) setInput("");
    setOpenSources(null);
    setError(null);
    setBusy(true);
    try {
      const result = await chatWithAIAction(next);
      if (result.profileEdit) {
        setPendingEdit(result.profileEdit);
      } else {
        setMessages([
          ...next,
          {
            role: "assistant",
            content: result.reply,
            citations: result.citations,
            followUps: result.followUps,
            logId: result.logId,
          },
        ]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("chat.errContact"));
    } finally {
      setBusy(false);
    }
  }

  async function rate(index: number, vote: "up" | "down") {
    const target = messages[index];
    if (!target?.logId || rating !== null) return;
    const previous = target.vote;
    setRating(index);
    setError(null);
    setMessages((m) => m.map((msg, i) => (i === index ? { ...msg, vote } : msg)));
    try {
      await rateAnswerAction(target.logId, vote);
      setThanked(index);
    } catch {
      // Kembalikan pilihannya: suara yang tidak sampai ke server jangan tampak
      // tersimpan di layar.
      setMessages((m) => m.map((msg, i) => (i === index ? { ...msg, vote: previous } : msg)));
      setError(t("chat.rateFailed"));
    } finally {
      setRating(null);
    }
  }

  async function copyAnswer(index: number) {
    const text = messages[index]?.content;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(index);
      setTimeout(() => setCopied((c) => (c === index ? null : c)), 2000);
    } catch {
      // Clipboard diblokir (izin/peramban lama) - biarkan saja tanpa mengganggu.
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
      <div ref={scrollRef} className="h-80 overflow-y-auto">
        <div className="flex min-h-full flex-col justify-end gap-3 p-5">
          {messages.length === 0 && !pendingEdit && (
            <p className="text-body-md text-on-surface-variant">
              {t("chat.greeting")}
            </p>
          )}
        {messages.map((m, i) => {
          if (m.role === "user") {
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className={"max-w-[85%] rounded-lg px-3 py-2 text-body-md " + bubbleClass("user")}
              >
                {m.content}
              </motion.div>
            );
          }
          const sources = m.citations ?? [];
          const followUps = m.followUps ?? [];
          const isLast = i === messages.length - 1;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="flex w-full flex-col items-start gap-1.5"
            >
              <div className={"max-w-[85%] rounded-lg px-3 py-2 text-body-md " + bubbleClass("assistant")}>
                {renderMarkdownLite(m.content)}
              </div>

              <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-on-surface-variant">
                {sources.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setOpenSources(openSources === i ? null : i)}
                    aria-expanded={openSources === i}
                    className="flex items-center gap-1.5 rounded-full border border-outline-variant px-2.5 py-1 text-label-caps uppercase tracking-wide hover:text-on-background"
                  >
                    <BookOpenText size={14} />
                    {t("chat.sources", { count: sources.length })}
                    <ChevronDown
                      size={14}
                      className={"transition-transform motion-reduce:transition-none " + (openSources === i ? "rotate-180" : "")}
                    />
                  </button>
                )}
                {m.logId && (
                    <>
                      <button
                        type="button"
                        onClick={() => rate(i, "up")}
                        disabled={rating === i}
                        aria-pressed={m.vote === "up"}
                        aria-label={t("chat.rateUp")}
                        title={t("chat.rateUp")}
                        className={
                          "rounded-md p-1.5 hover:text-on-background disabled:opacity-50 " +
                          (m.vote === "up" ? "text-primary-container" : "")
                        }
                      >
                        <ThumbsUp size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => rate(i, "down")}
                        disabled={rating === i}
                        aria-pressed={m.vote === "down"}
                        aria-label={t("chat.rateDown")}
                        title={t("chat.rateDown")}
                        className={
                          "rounded-md p-1.5 hover:text-on-background disabled:opacity-50 " +
                          (m.vote === "down" ? "text-error" : "")
                        }
                      >
                        <ThumbsDown size={15} />
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => copyAnswer(i)}
                    aria-label={t("chat.copy")}
                    title={t("chat.copy")}
                    className="rounded-md p-1.5 hover:text-on-background"
                  >
                    {copied === i ? <Check size={15} className="text-primary-container" /> : <Copy size={15} />}
                  </button>
                  {thanked === i && (
                    <span className="flex items-center gap-1 pl-1 text-label-caps text-primary-container">
                      <Check size={13} />
                      {t("chat.rateThanks")}
                    </span>
                  )}
                </div>

              {sources.length > 0 && openSources === i && (
                <ul className="w-full max-w-[90%] rounded-lg border border-outline-variant p-2">
                  {sources.map((c, ci) => {
                    const page = citationPage(t, c);
                    const label = (
                      <>
                        {c.title}
                        {page && <span className="text-label-caps text-on-surface-variant"> · {page}</span>}
                      </>
                    );
                    return (
                      <li key={ci}>
                        {c.slug ? (
                          // Tab baru: panel chat ini mengambang di atas halaman,
                          // pindah rute di tab yang sama akan menghapus riwayat
                          // percakapannya.
                          <a
                            href={`/help/${c.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-start gap-1.5 rounded px-1 py-1 text-body-md text-on-surface-variant hover:text-on-background hover:underline"
                          >
                            <ExternalLink size={13} className="mt-[3px] shrink-0" />
                            <span>{label}</span>
                          </a>
                        ) : (
                          <span className="flex items-start gap-1.5 px-1 py-1 text-body-md text-on-surface-variant">{label}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              {isLast && followUps.length > 0 && (
                <div className="flex w-full flex-col items-start gap-0.5">
                  {followUps.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => send(q)}
                      disabled={busy}
                      className="flex items-start gap-1.5 rounded px-1 py-1 text-left text-body-md text-on-surface-variant hover:text-on-background disabled:opacity-50"
                    >
                      <CornerDownRight size={14} className="mt-[3px] shrink-0" />
                      <span>{q}</span>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}

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
          className="min-w-0 flex-1 bg-soft-gray rounded-md p-3 text-body-md text-on-background placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary-container"
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
