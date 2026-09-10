"use client";

import { useState } from "react";
import { CheckboxField } from "@/components/console/form";
import { SubmitButton } from "@/components/console/submit-button";

interface Candidate {
  id: string;
  name: string | null;
  email: string;
}

/**
 * Pemilih anggota massal untuk satu divisi: kotak cari menyaring daftar
 * panjang kandidat, yang dicentang dikirim sekaligus sebagai anggota.
 * Client component cuma untuk filter ketikannya - pengirimannya tetap server
 * action biasa, tanpa state tambahan.
 *
 * Orang yang SUDAH di divisi ini (`assigned`) tidak muncul di daftar centang —
 * mereka sudah terdaftar (lihat daftar anggota di atas picker); menampilkannya
 * lagi tanpa tanda bikin bingung ("kok Jesica gak kecentang padahal udah masuk").
 */
export function DivisionMemberPicker({
  eventId,
  divisionId,
  candidates,
  assigned = [],
  action,
}: {
  eventId: string;
  divisionId: string;
  candidates: Candidate[];
  assigned?: { id: string; name: string | null }[];
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const assignedIds = new Set(assigned.map((a) => a.id));
  const pool = candidates.filter((c) => !assignedIds.has(c.id));
  const filtered = q
    ? pool.filter((c) => `${c.name ?? ""} ${c.email}`.toLowerCase().includes(q))
    : pool;

  return (
    <form action={action} className="mt-2 flex flex-col gap-2">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="divisionId" value={divisionId} />
      {assigned.length > 0 && (
        <p className="text-label-caps text-on-surface-variant">
          Sudah anggota: {assigned.map((a) => a.name ?? "(tanpa nama)").join(", ")}
        </p>
      )}
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Cari nama / email…"
        aria-label="Cari calon anggota"
        className="bg-soft-gray rounded-md p-2 text-body-md w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
      />
      <div className="max-h-48 overflow-y-auto border border-outline-variant rounded-md p-2 flex flex-col gap-1 bg-surface-container-lowest">
        {filtered.map((c) => (
          <CheckboxField
            key={c.id}
            name="userId"
            value={c.id}
            className="text-body-sm rounded px-1 py-0.5 hover:bg-surface-container-low"
            label={
              <>
                <span className="text-on-background">{c.name ?? "(tanpa nama)"}</span>{" "}
                <span className="text-on-surface-variant">{c.email}</span>
              </>
            }
          />
        ))}
        {filtered.length === 0 && (
          <p className="text-label-caps text-on-surface-variant py-2 text-center">
            {pool.length === 0 ? "Semua kandidat sudah jadi anggota divisi ini." : "Tidak ada yang cocok."}
          </p>
        )}
      </div>
      <SubmitButton
        disabled={filtered.length === 0}
        successMessage="Anggota ditambahkan."
        className="self-start text-label-caps uppercase tracking-wide bg-primary-container text-on-primary px-3 py-1.5 rounded-md hover:bg-primary transition-colors disabled:opacity-40 disabled:hover:bg-primary-container"
      >
        Tambahkan yang dicentang sebagai Anggota
      </SubmitButton>
    </form>
  );
}
