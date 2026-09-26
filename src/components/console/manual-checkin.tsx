"use client";

import { useState, useTransition, useRef } from "react";
import { Search, UserRound, CheckCircle2, BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import {
  searchCheckInCandidates,
  checkInByUserId,
  checkInCommitteeByUserId,
} from "@/app/actions/admin-events";

type Candidate = Awaited<ReturnType<typeof searchCheckInCandidates>>[number];

// Cek-in manual by nama - untuk peserta/panitia yang HP-nya mati, tidak bawa
// QR, atau QR belum sempat terbit. Validasi persis sama dengan jalur scan QR
// (lihat checkInByUserId/checkInCommitteeByUserId di admin-events.ts) - cuma
// jalur pencariannya beda, bukan jalur aksesnya.
type KindFilter = "all" | "participant" | "committee";
type StatusFilter = "all" | "in" | "out";

const selectCls =
  "bg-soft-gray rounded-md px-3 py-2 text-body-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container";

export function ManualCheckIn({ eventId, practice = false }: { eventId: string; practice?: boolean }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Candidate[]>([]);
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [checkingKey, setCheckingKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  function handleCheckIn(c: Candidate) {
    const key = `${c.kind}:${c.userId}`;
    setCheckingKey(key);
    startTransition(async () => {
      const action = c.kind === "committee" ? checkInCommitteeByUserId(eventId, c.userId, practice) : checkInByUserId(eventId, c.userId, practice);
      const res = await action;
      setCheckingKey(null);
      if (!res.ok) {
        toast.error(
          res.reason === "closed"
            ? "Check-in sudah ditutup."
            : res.reason
              ? "Tidak bisa check-in — periksa status pembayaran/pendaftaran."
              : "Tidak ditemukan."
        );
        return;
      }
      const kelompokSuffix = c.kelompok ? ` — Kelompok ${c.kelompok.kelompok} (${c.kelompok.warna})` : "";
      if ("dryRun" in res && res.dryRun) {
        toast.success(`${c.name} — valid (mode latihan, tidak dicatat).${kelompokSuffix}`);
        return;
      }
      toast.success((res.already ? `${c.name} sudah check-in sebelumnya.` : `${c.name} berhasil check-in.`) + kelompokSuffix);
      setResults((prev) => prev.map((r) => (r.kind === c.kind && r.userId === c.userId ? { ...r, alreadyAttended: true } : r)));
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
                  </div>
                </div>
                {c.alreadyAttended ? (
                  <span className="shrink-0 inline-flex items-center gap-1 text-label-caps uppercase tracking-wide text-primary-container">
                    <CheckCircle2 size={14} aria-hidden /> Hadir
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleCheckIn(c)}
                    disabled={checkingKey === key}
                    className="shrink-0 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-3 py-1.5 rounded-md hover:bg-primary transition-colors disabled:opacity-50"
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
