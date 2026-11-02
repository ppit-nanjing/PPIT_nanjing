"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, UserRound, CheckCircle2, BadgeCheck, FlaskConical, CircleAlert } from "lucide-react";
import {
  searchCheckInCandidates,
  checkInByUserId,
  checkInCommitteeByUserId,
} from "@/app/actions/admin-events";
import { CHECK_IN_BLOCK_DOOR_MESSAGE, CHECK_IN_BLOCK_LABEL } from "@/lib/event-checkin";
import { UndoCheckInButton } from "@/components/console/undo-checkin-button";

type Candidate = Awaited<ReturnType<typeof searchCheckInCandidates>>[number];

// Cek-in manual by nama - untuk peserta/panitia yang HP-nya mati, tidak bawa
// QR, atau QR belum sempat terbit. Validasi persis sama dengan jalur scan QR
// (lihat checkInByUserId/checkInCommitteeByUserId di admin-events.ts) - cuma
// jalur pencariannya beda, bukan jalur aksesnya.
//
// Umpan balik tampil di dalam kartu ini (bukan toast): halaman scan berada di
// luar /console, jadi tidak ada <Toaster/> di sana. Toast dulu hilang diam-diam,
// dan check-in peserta yang belum lunas gagal tanpa terlihat.
type KindFilter = "all" | "participant" | "committee";
type StatusFilter = "all" | "in" | "out";
type Feedback = {
  tone: "ok" | "practice" | "error";
  text: string;
  undo?: { kind: Candidate["kind"]; userId: string; name: string };
};

const selectCls =
  "bg-soft-gray rounded-md px-3 py-2 text-body-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container";

export function ManualCheckIn({ eventId, practice = false }: { eventId: string; practice?: boolean }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Candidate[]>([]);
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [checkingKey, setCheckingKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  const filteredResults = results.filter((r) => {
    if (kindFilter !== "all" && r.kind !== kindFilter) return false;
    if (statusFilter === "in" && !r.alreadyAttended) return false;
    if (statusFilter === "out" && r.alreadyAttended) return false;
    return true;
  });

  function handleQueryChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const rows = await searchCheckInCandidates(eventId, value);
        setResults(rows);
      });
    }, 300);
  }

  function setAttended(c: Candidate, alreadyAttended: boolean) {
    setResults((prev) => prev.map((r) => (r.kind === c.kind && r.userId === c.userId ? { ...r, alreadyAttended } : r)));
  }

  function handleCheckIn(c: Candidate) {
    const key = `${c.kind}:${c.userId}`;
    setCheckingKey(key);
    setFeedback(null);
    startTransition(async () => {
      const action = c.kind === "committee" ? checkInCommitteeByUserId(eventId, c.userId, practice) : checkInByUserId(eventId, c.userId, practice);
      const res = await action;
      setCheckingKey(null);
      if (!res.ok) {
        const reason = "reason" in res ? res.reason : null;
        setFeedback({
          tone: "error",
          text:
            reason === "closed"
              ? `${c.name}: check-in sudah ditutup.`
              : reason === "unpaid" || reason === "cancelled"
                ? `${c.name}: ${CHECK_IN_BLOCK_DOOR_MESSAGE[reason]}`
                : `${c.name}: tidak ditemukan, coba cari ulang namanya.`,
        });
        return;
      }
      const kelompokSuffix = c.kelompok ? ` — Kelompok ${c.kelompok.kelompok} (${c.kelompok.warna})` : "";
      if ("dryRun" in res && res.dryRun) {
        setFeedback({ tone: "practice", text: `${c.name} — valid (mode latihan, tidak dicatat).${kelompokSuffix}` });
        return;
      }
      setFeedback({
        tone: "ok",
        text: (res.already ? `${c.name} sudah check-in sebelumnya.` : `${c.name} berhasil check-in.`) + kelompokSuffix,
        undo: res.already ? undefined : { kind: c.kind, userId: c.userId, name: c.name },
      });
      setAttended(c, true);
      router.refresh(); // hitungan hadir di atas halaman ikut naik
    });
  }

  return (
    <div className={`mb-8 flex flex-col gap-3 rounded-xl border p-4 ${practice ? "border-amber-300 bg-amber-50" : "border-outline-variant bg-surface-container-lowest"}`}>
      <label className="flex flex-col gap-1.5">
        <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">
          Check-in manual (cari nama)
        </span>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Ketik nama peserta atau panitia..."
            className="w-full bg-soft-gray rounded-md p-3 pl-9 text-body-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
          />
        </div>
      </label>

      {feedback && (
        <div
          role={feedback.tone === "error" ? "alert" : "status"}
          className={`flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between ${
            feedback.tone === "error"
              ? "border-error bg-error-container text-on-error-container"
              : feedback.tone === "practice"
                ? "border-amber-300 bg-amber-100 text-amber-900"
                : "border-outline-variant bg-surface-container-low text-on-background"
          }`}
        >
          <p className="flex items-start gap-2 text-body-md">
            {feedback.tone === "error" ? (
              <CircleAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            ) : feedback.tone === "practice" ? (
              <FlaskConical size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            ) : (
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-primary-container" aria-hidden="true" />
            )}
            <span>{feedback.text}</span>
          </p>
          {feedback.undo && (
            <UndoCheckInButton
              eventId={eventId}
              kind={feedback.undo.kind}
              userId={feedback.undo.userId}
              onUndone={() => {
                const u = feedback.undo!;
                setAttended({ kind: u.kind, userId: u.userId } as Candidate, false);
                setFeedback({ tone: "ok", text: `Check-in ${u.name} dibatalkan.` });
                router.refresh();
              }}
            />
          )}
        </div>
      )}

      {query.trim().length >= 2 && (
        <>
          <div className="flex gap-2">
            <select
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value as KindFilter)}
              aria-label="Filter peserta/panitia"
              className={selectCls}
            >
              <option value="all">Semua</option>
              <option value="participant">Peserta</option>
              <option value="committee">Panitia</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              aria-label="Filter status hadir"
              className={selectCls}
            >
              <option value="all">Hadir & belum</option>
              <option value="out">Belum hadir</option>
              <option value="in">Sudah hadir</option>
            </select>
          </div>
          <ul className="flex flex-col gap-1.5 max-h-80 overflow-y-auto">
          {filteredResults.length === 0 && !isPending && (
            <li className="text-body-sm text-on-surface-variant px-1 py-2">Tidak ada yang cocok.</li>
          )}
          {filteredResults.map((c) => {
            const key = `${c.kind}:${c.userId}`;
            return (
              <li
                key={key}
                className="flex items-center justify-between gap-3 rounded-md border border-outline-variant bg-background px-3 py-2.5"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <UserRound size={16} className="text-on-surface-variant shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-body-md text-on-background truncate">{c.name}</p>
                    <p className="text-label-caps text-on-surface-variant">
                      {c.kind === "committee" ? <BadgeCheck size={11} className="inline align-[-1px]" aria-hidden /> : null}{" "}
                      {c.kind === "committee" ? (c.label ?? "Panitia") : "Peserta"}
                      {c.kelompok && ` · Kelompok ${c.kelompok.kelompok} (${c.kelompok.warna})`}
                    </p>
                    {c.blocked && !c.alreadyAttended && (
                      <p className="mt-0.5 text-body-sm text-on-surface-variant">{CHECK_IN_BLOCK_DOOR_MESSAGE[c.blocked]}</p>
                    )}
                  </div>
                </div>
                {c.alreadyAttended ? (
                  <span className="shrink-0 inline-flex items-center gap-1 text-label-caps uppercase tracking-wide text-primary-container">
                    <CheckCircle2 size={14} aria-hidden /> Hadir
                  </span>
                ) : c.blocked ? (
                  <span className="shrink-0 rounded-md border border-error px-2.5 py-1.5 text-label-caps uppercase tracking-wide text-error">
                    {CHECK_IN_BLOCK_LABEL[c.blocked]}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleCheckIn(c)}
                    disabled={checkingKey === key}
                    className="shrink-0 min-h-11 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-4 py-2 rounded-md hover:bg-primary transition-colors disabled:opacity-50"
                  >
                    {checkingKey === key ? "..." : "Check-in"}
                  </button>
                )}
              </li>
            );
          })}
          </ul>
        </>
      )}
    </div>
  );
}
